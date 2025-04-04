// web/index.js
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import path from "path";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

// Determine the static path - crucial for serving frontend files
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? path.resolve(process.cwd(), "frontend/dist")
    : path.resolve(process.cwd(), "frontend");

const app = express();

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  async (req, res, next) => {
    // After successful install or re-auth, register the Carrier Service
    const session = res.locals.shopify.session;
    await registerCarrierService(session);
    return shopify.redirectToShopifyOrAppRoot()(req, res, next);
  }
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

// API routes should be protected with authentication
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());

// In-memory carriers array (replace with DB if needed)
let carriers = [
  { name: "DPD", price: 1000 }, // €10
  { name: "Post", price: 1200 }, // €12
];

// Carrier Service registration function
async function registerCarrierService(session) {
  try {
    const carrier = new shopify.api.rest.CarrierService({ session });
    carrier.name = "RuleBasedShipping";
    carrier.callback_url = `${process.env.HOST}/carrier-service`;
    carrier.service_discovery = true;

    await carrier.save({ update: true });
    console.log("✅ Carrier Service registered successfully");
  } catch (error) {
    console.error("❌ Error registering Carrier Service:", error.message);
  }
}

// Carrier Service endpoint that doesn't need auth since it's called by Shopify
app.post("/carrier-service", express.json(), (req, res) => {
  const request = req.body;
  console.log("Received rate request:", JSON.stringify(request, null, 2));

  try {
    // Sum up total weight (in grams)
    const totalWeightGrams = request.rate.items.reduce(
      (acc, item) => acc + item.grams * item.quantity,
      0
    );

    // Convert grams to kg
    const totalWeightKg = totalWeightGrams / 1000;
    const maxParcelWeight = 31.5; // Maximum weight per parcel in kg
    
    // Calculate number of parcels needed (round up)
    const parcels = Math.ceil(totalWeightKg / maxParcelWeight);
    
    console.log(`Order weight: ${totalWeightKg}kg, requires ${parcels} parcel(s)`);

    // Build rates for each carrier
    const rates = carriers.map((carrier) => ({
      service_name: `${carrier.name} (${parcels} parcel${parcels > 1 ? "s" : ""})`,
      service_code: carrier.name.toLowerCase(),
      total_price: carrier.price * parcels, // price is in cents, e.g. 1000 => €10
      currency: request.rate.currency || "EUR", // Use store's currency or default to EUR
      min_delivery_date: new Date(Date.now() + 1 * 86400000).toISOString(), // Tomorrow
      max_delivery_date: new Date(Date.now() + 5 * 86400000).toISOString(), // 5 days from now
      description: `Delivery via ${carrier.name}, split into ${parcels} parcel(s)`,
    }));

    // Sort rates by price (ascending) and pick the cheapest
    rates.sort((a, b) => a.total_price - b.total_price);
    const cheapestRate = rates[0];
    
    console.log("Returning cheapest rate:", cheapestRate);
    
    // Return only the cheapest rate to Shopify
    res.status(200).json({ rates: [cheapestRate] });
  } catch (error) {
    console.error("Error calculating shipping rates:", error);
    res.status(500).json({ error: "Error calculating shipping rates" });
  }
});

// API route handlers
app.get("/api/carriers", (_req, res) => {
  res.json(carriers);
});

app.post("/api/carriers", (req, res) => {
  const { name, price } = req.body;
  
  // Validate input
  if (!name || typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: "Invalid carrier data. Name and price (in cents) are required." 
    });
  }
  
  // Check for duplicate names
  if (carriers.some(carrier => carrier.name.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ 
      success: false, 
      error: "A carrier with this name already exists" 
    });
  }
  
  // Add the new carrier
  carriers.push({ name, price: parseInt(price, 10) });
  res.status(200).json({ success: true, carriers });
});

app.put("/api/carriers/:name", (req, res) => {
  const { name } = req.params;
  const { price } = req.body;
  
  // Validate input
  if (typeof price !== 'number' || price <= 0) {
    return res.status(400).json({ 
      success: false, 
      error: "Invalid price. Price (in cents) must be a positive number." 
    });
  }
  
  // Find and update the carrier
  const carrierIndex = carriers.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  
  if (carrierIndex === -1) {
    return res.status(404).json({ 
      success: false, 
      error: "Carrier not found" 
    });
  }
  
  carriers[carrierIndex].price = parseInt(price, 10);
  res.status(200).json({ success: true, carriers });
});

app.delete("/api/carriers/:name", (req, res) => {
  const { name } = req.params;
  
  const initialLength = carriers.length;
  carriers = carriers.filter(c => c.name.toLowerCase() !== name.toLowerCase());
  
  if (carriers.length === initialLength) {
    return res.status(404).json({ 
      success: false, 
      error: "Carrier not found" 
    });
  }
  
  res.status(200).json({ success: true, carriers });
});

// Other API endpoints
app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);

  res.status(200).send({ count: countData.data.productsCount.count });
});

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }

  res.status(status).send({ success: status === 200, error });
});

// Set security headers
app.use(shopify.cspHeaders());

// Correctly serve static frontend files
app.use(serveStatic(STATIC_PATH, { index: false }));

// Important: handle all routes for SPA frontend
app.use("/*", shopify.ensureInstalledOnShop(), (req, res) => {
  // Log request to help debug issues
  console.log(`Handling request for: ${req.path}, query:`, req.query);
  
  const htmlFile = join(
    process.env.NODE_ENV === "production" ? STATIC_PATH : STATIC_PATH,
    "index.html"
  );
  
  try {
    // Ensure the file exists
    const indexContent = readFileSync(htmlFile).toString();
    const updatedContent = indexContent.replace(
      "%VITE_SHOPIFY_API_KEY%", 
      process.env.SHOPIFY_API_KEY || ""
    );
    
    return res
      .status(200)
      .set("Content-Type", "text/html")
      .send(updatedContent);
  } catch (error) {
    console.error(`Error serving index.html: ${error.message}`);
    res.status(500).send(`Error loading application: ${error.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Static files served from: ${STATIC_PATH}`);
});
// web/index.js

import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-01"; // Use the correct API version

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

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

// Require authentication for /api routes
app.use("/api/*", shopify.validateAuthenticatedSession());
app.use(express.json());

// Example endpoint for counting products via GraphQL
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

// Example endpoint for creating a product
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

// Connect the REST resources for later usage
shopify.api.rest = restResources;

/**
 * Registers or updates a Shopify Carrier Service so we can provide
 * real-time shipping rates at checkout.
 */
async function registerCarrierService(session) {
  try {
    const carrier = new shopify.api.rest.CarrierService({ session });
    carrier.name = "RuleBasedShipping";
    carrier.callback_url = `${process.env.HOST}/carrier-service`;
    carrier.service_discovery = true;

    await carrier.save({ update: true });
    console.log("✅ Carrier Service registered");
  } catch (error) {
    console.error("❌ Error registering Carrier Service:", error.message);
  }
}

// In-memory carriers array (replace with DB if needed)
let carriers = [
  { name: "DPD", price: 1000 }, // €10
  { name: "Post", price: 1200 }, // €12
];

/**
 * Carrier Service callback route
 * This receives the shipping rate request from Shopify,
 * splits orders into multiple parcels, calculates cost,
 * returns the cheapest shipping option.
 */
app.post("/carrier-service", express.json(), (req, res) => {
  const request = req.body;

  // Sum up total weight (in grams)
  const totalWeightGrams = request.rate.items.reduce(
    (acc, item) => acc + item.grams * item.quantity,
    0
  );

  // Convert grams to kg
  const totalWeightKg = totalWeightGrams / 1000;
  const maxParcelWeight = 31.5;
  const parcels = Math.ceil(totalWeightKg / maxParcelWeight);

  // Build rates for each carrier
  const rates = carriers.map((carrier) => ({
    service_name: `${carrier.name} (${parcels} parcel${parcels > 1 ? "s" : ""})`,
    service_code: carrier.name.toLowerCase(),
    total_price: carrier.price * parcels, // price is in cents, e.g. 1000 => €10
    currency: "EUR",
    min_delivery_date: new Date().toISOString(),
    max_delivery_date: new Date(Date.now() + 3 * 86400000).toISOString(),
    description: "Rule-based calculated shipping rate",
  }));

  // Choose the cheapest option
  const cheapest = rates.reduce((min, curr) =>
    curr.total_price < min.total_price ? curr : min
  );

  // Return only the cheapest rate to Shopify
  res.status(200).json({ rates: [cheapest] });
});

// Get the list of carriers
app.get("/api/carriers", (_req, res) => {
  res.json(carriers);
});

// Add a new carrier (name and price in cents)
app.post("/api/carriers", (req, res) => {
  const { name, price } = req.body;
  // Basic validation omitted for brevity
  carriers.push({ name, price });
  res.status(200).json({ success: true });
});

// Set security headers and serve static frontend files
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

// Catch-all route to serve the React app
app.use("/*", shopify.ensureInstalledOnShop(), (_req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// web/routes/shipping.js
import express from "express";
import { getCarriers } from '../database/models/carrier.js';
import { calculateShippingRates } from '../services/shipping.js';

const router = express.Router();

// Handle shipping rate requests from Shopify
router.post("/", async (req, res) => {
  const request = req.body;
  console.log("Received rate request:", JSON.stringify(request, null, 2));

  try {
    // Get carriers from database
    const carriers = await getCarriers();
    
    if (carriers.length === 0) {
      console.log("No carriers configured");
      return res.status(200).json({ rates: [] });
    }

    // Calculate shipping rates based on the request
    const rates = await calculateShippingRates(request, carriers);
    
    // Return only the cheapest rate to Shopify (or all rates if needed)
    res.status(200).json({ rates: [rates[0]] });
  } catch (error) {
    console.error("Error calculating shipping rates:", error);
    res.status(500).json({ error: "Error calculating shipping rates" });
  }
});

export default router;
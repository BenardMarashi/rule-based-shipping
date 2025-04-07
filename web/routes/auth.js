// web/routes/auth.js
import express from "express";
import shopify from '../services/shopify.js';
import { registerCarrierService } from '../services/carrier.js';

const router = express.Router();

// Start OAuth flow
router.get("/", shopify.auth.begin());

// OAuth callback
router.get(
  "/callback",
  shopify.auth.callback(),
  async (req, res, next) => {
    // After successful install or re-auth, register the Carrier Service
    const session = res.locals.shopify.session;
    await registerCarrierService(session);
    return shopify.redirectToShopifyOrAppRoot()(req, res, next);
  }
);

export default router;
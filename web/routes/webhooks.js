// web/routes/webhooks.js
import express from "express";
import shopify from '../services/shopify.js';
import PrivacyWebhookHandlers from '../services/privacy.js';

const router = express.Router();

// Handle Shopify webhooks
router.post(
  "/",
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

export default router;
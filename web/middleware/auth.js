// web/middleware/auth.js
import shopify from '../services/shopify.js';

/**
 * Middleware to validate Shopify authenticated sessions
 */
export function validateShopifyRequest(req, res, next) {
  return shopify.validateAuthenticatedSession()(req, res, next);
}

/**
 * Middleware to ensure a shop is installed
 */
export function ensureInstalledOnShop(req, res, next) {
  return shopify.ensureInstalledOnShop()(req, res, next);
}
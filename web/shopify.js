// web/shopify.js
import { BillingInterval, LATEST_API_VERSION, LogSeverity } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";
import { PostgreSQLSessionStorage } from "@shopify/shopify-app-session-storage-postgresql";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// PostgreSQL session storage configuration
const sessionStorage = new PostgreSQLSessionStorage({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'shipping_app',
  username: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false
});

console.log("Starting Shopify app initialization with the following environment:");
console.log(`HOST: ${process.env.HOST}`);
console.log(`SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY ? "Configured" : "Missing"}`);
console.log(`SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET ? "Configured" : "Missing"}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`Database: PostgreSQL on ${process.env.PG_HOST || 'localhost'}`);

const shopify = shopifyApp({
  api: {
    apiVersion: LATEST_API_VERSION,
    restResources,
    logger: {
      level: LogSeverity.Debug,
      httpRequests: true,
      timestamps: true,
    },
    future: {
      customerAddressDefaultFix: true,
      lineItemBilling: true,
      unstable_managedPricingSupport: true,
    },
    billing: undefined, // or replace with billingConfig above to enable example billing
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage: sessionStorage,
});

// Log successful initialization
console.log("Shopify app initialized successfully");
console.log("Available REST resources:", Object.keys(shopify.api.rest).join(", "));

export default shopify;
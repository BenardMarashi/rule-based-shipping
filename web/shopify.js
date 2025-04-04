import { BillingInterval, LATEST_API_VERSION, LogSeverity } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { SQLiteSessionStorage } from "@shopify/shopify-app-session-storage-sqlite";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-10";

const DB_PATH = `${process.cwd()}/database.sqlite`;

// The transactions with Shopify will always be marked as test transactions, unless NODE_ENV is production.
// See the ensureBilling helper to learn more about billing in this template.
const billingConfig = {
  "My Shopify One-Time Charge": {
    // This is an example configuration that would do a one-time charge for $5 (only USD is currently supported)
    amount: 5.0,
    currencyCode: "USD",
    interval: BillingInterval.OneTime,
  },
};

console.log("Starting Shopify app initialization with the following environment:");
console.log(`HOST: ${process.env.HOST}`);
console.log(`SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY ? "Configured" : "Missing"}`);
console.log(`SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET ? "Configured" : "Missing"}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

const shopify = shopifyApp({
  api: {
    apiVersion: LATEST_API_VERSION,
    restResources,
    logger: {
      level: LogSeverity.Debug, // Add detailed logging
      httpRequests: true, // Log HTTP requests
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
  // This should be replaced with your preferred storage strategy
  sessionStorage: new SQLiteSessionStorage(DB_PATH),
});

// Log successful initialization
console.log("Shopify app initialized successfully");
console.log("Available REST resources:", Object.keys(shopify.api.rest).join(", "));

export default shopify;
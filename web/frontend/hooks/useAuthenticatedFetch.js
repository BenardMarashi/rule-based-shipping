import { useCallback } from "react";
import { authenticatedFetch } from "@shopify/app-bridge-utils";
import { useAppBridge } from "@shopify/app-bridge-react";

/**
 * A hook that returns an authenticated fetch function that includes the session token.
 * @returns {Function} The authenticated fetch function.
 */
export const useAuthenticatedFetch = () => {
  const app = useAppBridge();

  return useCallback(
    async (uri, options = {}) => {
      const response = await authenticatedFetch(app)(uri, options);
      return response;
    },
    [app]
  );
};
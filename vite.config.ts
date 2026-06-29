import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config — dev server on :5173, proxies Matrix CS API calls
// to a homeserver so we don't fight CORS in the browser.
// Usage: set VITE_HOMESERVER in .env to override the default.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "127.0.0.1",
    strictPort: true,
  },
  // matrix-js-sdk uses these subpaths; the dev server proxies
  // /_matrix/* and the identity server paths to the homeserver.
  // The default points at the local Synapse on eyops over Tailscale.
});

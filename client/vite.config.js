import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load environment variables from the parent workspace root directory
  const env = loadEnv(mode, "../", "");
  const backendPort = env.PORT || 3001;

  return {
    plugins: [react()],
    envDir: "../",
    server: {
      proxy: {
        "/api": `http://localhost:${backendPort}`,
        "/socket.io": { target: `http://localhost:${backendPort}`, ws: true },
      },
    },
  };
});

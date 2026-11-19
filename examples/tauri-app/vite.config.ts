import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // The window and tauri-cordis/client/react have to run the same copy of React.
  resolve: { dedupe: ["react", "react-dom"] },
  clearScreen: false,
  server: { port: 1430, strictPort: true },
});

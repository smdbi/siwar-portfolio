import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Force every import path to resolve to a single instance
  resolve: {
    dedupe: ["react", "react-dom", "three", "@react-three/fiber", "@react-three/drei"],
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    "process.env": "{}",      // avoid runtime process references
    global: "globalThis",
  },
  optimizeDeps: {
    // helps prebundling during dev; harmless for lib build
    include: [
      "react",
      "react-dom",
      "three",
      "@react-three/fiber",
      "@react-three/drei",
      // keep these ONLY if you still use Bloom:
      "@react-three/postprocessing",
      "postprocessing",
    ],
  },
  build: {
    lib: {
      entry: "src/seaweed-widget.tsx", // the entry that exports mountSeaweed + __sdgVersion
      name: "SeaweedWidget",
      fileName: () => "seaweed-widget.js",
      formats: ["es"],
    },
    // Bundle everything so the HTML page doesn’t need to provide React/Three/Fiber
    rollupOptions: { external: [] },
    sourcemap: true,
    target: "es2019",
  },
});

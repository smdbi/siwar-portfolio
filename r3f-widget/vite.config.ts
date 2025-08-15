import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": "{}",
    "process": '{"env":{}}'
  },
  build: {
    lib: {
      entry: "src/index.tsx",       // <-- file that exports mountSeaweed
      name: "SeaweedWidget",
      formats: ["es"],
      fileName: () => "seaweed-widget.js",
    },
    rollupOptions: {
      output: { inlineDynamicImports: true, manualChunks: undefined },
      external: [],                 // bundle everything in one file
    },
    cssCodeSplit: false,
    sourcemap: false,
    emptyOutDir: true,
    minify: "esbuild",
  },
});

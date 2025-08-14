import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  // Replace process.env at build-time so the bundle doesn't reference `process` in the browser
  define: {
    "process.env.NODE_ENV": '"production"', // must be a JS string literal
    "process.env": "{}",                    // <-- no parentheses
    "process": '{"env":{}}'                 // fallback if something reads `process` directly
  },
  build: {
    lib: {
      entry: "src/index.tsx",      // this file must exist and contain JSX
      name: "SeaweedWidget",
      formats: ["es"],
      fileName: () => "seaweed-widget.js",
    },
    rollupOptions: {
      // one self-contained file (no chunks, no absolute /assets/)
      output: { inlineDynamicImports: true, manualChunks: undefined },
      external: [],
    },
    cssCodeSplit: false,
    sourcemap: false,
    emptyOutDir: true,
    minify: "esbuild",
  },
});

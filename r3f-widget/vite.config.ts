// r3f-widget/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env": "{}",      // do not wrap with () 
    "process": '{"env":{}}'   // last-resort shim if something touches process
  },
  build: {
    lib: {
      entry: "src/index.tsx",       // <- MUST exist & export mountSeaweed (step 2)
      name: "SeaweedWidget",
      formats: ["es"],
      fileName: () => "seaweed-widget.js",
    },
    rollupOptions: {
      // single self-contained file; no external chunks
      output: { inlineDynamicImports: true, manualChunks: undefined },
      external: [], // bundle react/three/r3f/drei into this file
    },
    cssCodeSplit: false,
    sourcemap: false,
    emptyOutDir: true,
    minify: "esbuild",
  },
});

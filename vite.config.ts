import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths, so the built games work from any folder on any static host.
  base: "./",
  build: {
    // One page per game, plus the home page that links to them.
    rolldownOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        "balloon-pop": resolve(import.meta.dirname, "balloon-pop/index.html"),
        "fresh-cuts": resolve(import.meta.dirname, "fresh-cuts/index.html"),
      },
    },
  },
});

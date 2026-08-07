import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { join, extname } from "path";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".css": "text/css",
};

const serveRawHtml = () => ({
  name: "serve-raw-html",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      let url = req.url || "/";
      url = url.split("?")[0];
      if (url === "/") url = "/index.html";
      const filePath = join(process.cwd(), decodeURIComponent(url));
      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
        res.end(content);
      } catch {
        next();
      }
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      let url = req.url || "/";
      url = url.split("?")[0];
      if (url === "/") url = "/index.html";
      const filePath = join(process.cwd(), decodeURIComponent(url));
      try {
        const content = readFileSync(filePath);
        const ext = extname(filePath);
        res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
        res.end(content);
      } catch {
        next();
      }
    });
  },
});

export default defineConfig({
  root: ".",
  server: {
    port: 5173,
    open: false,
    fs: { strict: false },
  },
  optimizeDeps: { exclude: ["@electric-sql/pglite"] },
  plugins: [serveRawHtml()],
  appType: "custom",
});

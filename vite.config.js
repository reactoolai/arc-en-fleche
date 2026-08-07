import { defineConfig } from "vite";
import { readFileSync, existsSync, readdirSync } from "fs";
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

const rawHtmlPlugin = () => ({
  name: "raw-html",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      let url = (req.url || "/").split("?")[0];
      if (url === "/") url = "/index.html";
      const filePath = join(process.cwd(), decodeURIComponent(url));
      try {
        if (!existsSync(filePath)) { next(); return; }
        const content = readFileSync(filePath);
        res.setHeader("Content-Type", mimeTypes[extname(filePath)] || "application/octet-stream");
        res.end(content);
      } catch { next(); }
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, res, next) => {
      let url = (req.url || "/").split("?")[0];
      if (url === "/") url = "/index.html";
      const filePath = join(process.cwd(), decodeURIComponent(url));
      try {
        if (!existsSync(filePath)) { next(); return; }
        const content = readFileSync(filePath);
        res.setHeader("Content-Type", mimeTypes[extname(filePath)] || "application/octet-stream");
        res.end(content);
      } catch { next(); }
    });
  },
  buildStart() {
    // Emit the raw HTML file as-is, skipping Vite's HTML/CSS pipeline entirely
    const content = readFileSync(join(process.cwd(), "index.html"), "utf-8");
    this.emitFile({ type: "asset", fileName: "index.html", source: content });
    // Copy uploads directory so images resolve in production builds
    const uploadsDir = join(process.cwd(), "uploads");
    if (existsSync(uploadsDir)) {
      for (const file of readdirSync(uploadsDir)) {
        this.emitFile({
          type: "asset",
          fileName: "uploads/" + file,
          source: readFileSync(join(uploadsDir, file)),
        });
      }
    }
    // Copy public/album photo directory so album images resolve in production builds
    const albumDir = join(process.cwd(), "public", "album photo");
    if (existsSync(albumDir)) {
      for (const file of readdirSync(albumDir)) {
        this.emitFile({
          type: "asset",
          fileName: "album photo/" + file,
          source: readFileSync(join(albumDir, file)),
        });
      }
    }
    // Copy support.js, data.js, and supabase-client.js so the runtime and static data resolve in production builds
    for (const f of ["support.js", "data.js", "supabase-client.js"]) {
      const p = join(process.cwd(), f);
      if (existsSync(p)) {
        this.emitFile({ type: "asset", fileName: f, source: readFileSync(p) });
      }
    }
    // Copy public root-level assets (banner, etc.) so they resolve in production builds
    const publicDir = join(process.cwd(), "public");
    if (existsSync(publicDir)) {
      for (const file of readdirSync(publicDir)) {
        const fp = join(publicDir, file);
        if (existsSync(fp) && file.endsWith(".png")) {
          this.emitFile({ type: "asset", fileName: file, source: readFileSync(fp) });
        }
      }
    }
  },
});

export default defineConfig({
  root: ".",
  server: { port: 5173, open: false, fs: { strict: false } },
  optimizeDeps: { exclude: ["@electric-sql/pglite"] },
  plugins: [rawHtmlPlugin()],
  appType: "custom",
  build: {
    rollupOptions: {
      input: "supabase-client.js",
      output: { entryFileNames: "supabase-client.js" },
    },
    cssCodeSplit: false,
    assetsInlineLimit: 0,
  },
});

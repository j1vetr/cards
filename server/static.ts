import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve uploads from client/public/uploads (for production uploaded files)
  const uploadsPath = path.resolve(process.cwd(), "client/public/uploads");
  if (fs.existsSync(uploadsPath)) {
    app.use("/uploads", express.static(uploadsPath, {
      maxAge: '7d',
      immutable: true,
      etag: true,
    }));
  }

  // Serve card images downloaded at runtime (not in build output)
  const cardsPath = path.resolve(process.cwd(), "client/public/cards");
  if (fs.existsSync(cardsPath)) {
    app.use("/cards", express.static(cardsPath, {
      maxAge: '7d',
      etag: true,
    }));
  }

  // Serve static assets with aggressive caching
  app.use(express.static(distPath, {
    maxAge: '1y',
    immutable: true,
    etag: true,
    index: false,
    setHeaders: (res, filePath) => {
      // HTML files should not be cached
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      // JS and CSS files with hash can be cached forever
      else if (filePath.match(/\.(js|css)$/) && filePath.includes('.')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Images and fonts
      else if (filePath.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

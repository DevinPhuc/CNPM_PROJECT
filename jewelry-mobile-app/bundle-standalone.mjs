import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
const assetsDir = path.join(distDir, "assets");
const files = fs.readdirSync(assetsDir);
const cssFile = files.find((f) => f.endsWith(".css"));
const jsFile = files.find((f) => f.endsWith(".js"));
const css = fs.readFileSync(path.join(assetsDir, cssFile), "utf8");
const js = fs.readFileSync(path.join(assetsDir, jsFile), "utf8");

const html = `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#faf8f5" />
    <title>Hương Jewelry – Mobile App Interface</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&display=swap" rel="stylesheet" />
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">${js}</script>
  </body>
</html>`;

const androidAssetsDir = path.join(__dirname, "android", "app", "src", "main", "assets");
fs.mkdirSync(androidAssetsDir, { recursive: true });
fs.writeFileSync(path.join(androidAssetsDir, "index.html"), html, "utf8");
fs.writeFileSync(path.join(__dirname, "preview.html"), html, "utf8");
fs.writeFileSync(path.join(__dirname, "..", "client", "mobile-app.html"), html, "utf8");

console.log("Synced standalone bundle to Android assets, preview.html, and client/mobile-app.html (" + html.length + " bytes)");

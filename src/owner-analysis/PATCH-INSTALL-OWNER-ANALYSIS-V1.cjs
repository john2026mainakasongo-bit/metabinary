const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const appPath = path.join(root, "src", "App.jsx");
const pageSource = path.join(root, "OWNER-ANALYSIS-SOURCE", "OwnerAnalysisPage.jsx");
const cssSource = path.join(root, "OWNER-ANALYSIS-SOURCE", "OwnerAnalysisPage.css");
const pageTarget = path.join(root, "src", "OwnerAnalysisPage.jsx");
const cssTarget = path.join(root, "src", "OwnerAnalysisPage.css");

if (!fs.existsSync(appPath)) {
  console.error("Owner Analysis V1 stopped: src/App.jsx not found.");
  process.exit(1);
}
if (!fs.existsSync(pageSource) || !fs.existsSync(cssSource)) {
  console.error("Owner Analysis V1 stopped: OWNER-ANALYSIS-SOURCE files not found.");
  process.exit(1);
}

let app = fs.readFileSync(appPath, "utf8");

if (!app.includes('import OwnerAnalysisPage from "./OwnerAnalysisPage.jsx";')) {
  const anchor = 'import DesktopTradePage from "./DesktopTradePage.jsx";';
  if (!app.includes(anchor)) {
    console.error("Owner Analysis V1 stopped: DesktopTradePage import anchor not found.");
    process.exit(1);
  }
  app = app.replace(anchor, `${anchor}\nimport OwnerAnalysisPage from "./OwnerAnalysisPage.jsx";`);
}

if (!app.includes("const ownerAnalysisMode =")) {
  const oldBlock = `export default function App() {
  useDisableMobilePinchZoom();
  const params = new URLSearchParams(window.location.search);
  const adminMode = window.location.pathname.startsWith("/admin") || params.get("admin") === "1";
  return adminMode ? <AdminPortal /> : <TradingApp />;
}`;

  const newBlock = `export default function App() {
  useDisableMobilePinchZoom();
  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;
  const ownerAnalysisMode = pathname.startsWith("/owner-analysis") || params.get("ownerAnalysis") === "1";
  const adminMode = pathname.startsWith("/admin") || params.get("admin") === "1";
  if (ownerAnalysisMode) return <OwnerAnalysisPage />;
  return adminMode ? <AdminPortal /> : <TradingApp />;
}`;

  if (!app.includes(oldBlock)) {
    console.error("Owner Analysis V1 stopped: current App() route block not found.");
    process.exit(1);
  }
  app = app.replace(oldBlock, newBlock);
}

fs.copyFileSync(appPath, `${appPath}.before-owner-analysis-v1`);
fs.copyFileSync(pageSource, pageTarget);
fs.copyFileSync(cssSource, cssTarget);
fs.writeFileSync(appPath, app, "utf8");

console.log("");
console.log("MetaBinary Owner Analysis Tool v1 installed successfully.");
console.log("Route: /owner-analysis");
console.log("Requires a valid MetaBinary Admin session.");
console.log("Customer navigation was not changed.");
console.log("Backend trading logic was not changed.");
console.log("Next: npm run build");

const fs = require("node:fs");
const path = require("node:path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("src/App.jsx not found.");
  process.exit(1);
}

let source = fs.readFileSync(appPath, "utf8");
const original = source;

const marker = "METABINARY_V210_VIEWPORT_SHELL";

if (source.includes(marker)) {
  console.log("V210 viewport shell support is already installed.");
  process.exit(0);
}

const insertion = `
  // METABINARY_V210_VIEWPORT_SHELL
  useEffect(() => {
    const syncViewportHeightV210 = () => {
      const height = Math.round(
        window.visualViewport?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight ||
        0
      );

      if (height > 0) {
        document.documentElement.style.setProperty(
          "--mb-viewport-height",
          \`\${height}px\`
        );
      }
    };

    syncViewportHeightV210();

    window.addEventListener("resize", syncViewportHeightV210, { passive: true });
    window.addEventListener("orientationchange", syncViewportHeightV210, { passive: true });
    window.visualViewport?.addEventListener("resize", syncViewportHeightV210, { passive: true });

    return () => {
      window.removeEventListener("resize", syncViewportHeightV210);
      window.removeEventListener("orientationchange", syncViewportHeightV210);
      window.visualViewport?.removeEventListener("resize", syncViewportHeightV210);
    };
  }, []);
`;

const anchor = "function App() {";

if (!source.includes(anchor)) {
  console.error("Could not find function App() in src/App.jsx. No changes written.");
  process.exit(1);
}

source = source.replace(anchor, anchor + insertion);

const backup = `${appPath}.before-v210-viewport-shell.bak`;
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, original, "utf8");
}

fs.writeFileSync(appPath, source, "utf8");

console.log("V210 viewport shell support installed successfully.");
console.log("Only the real visual viewport height variable was added.");
console.log("Trade page internal sizing was not changed.");
console.log(`Backup: ${backup}`);

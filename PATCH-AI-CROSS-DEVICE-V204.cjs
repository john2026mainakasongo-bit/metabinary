const fs = require("node:fs");
const path = require("node:path");

const projectRoot = process.cwd();
const appPath = path.join(projectRoot, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error(`src/App.jsx was not found at: ${appPath}`);
  process.exit(1);
}

let source = fs.readFileSync(appPath, "utf8");
const original = source;

const oldInit =
  'const [position, setPosition] = useState(() => readStore(STORE.aiPosition, { x: 18, y: 130 }));';

const newInit = `const [position, setPosition] = useState(() => {
    const saved = readStore(STORE.aiPosition, null);

    if (
      saved &&
      Number.isFinite(Number(saved.xRatio)) &&
      Number.isFinite(Number(saved.yRatio))
    ) {
      return {
        xRatio: Math.max(0, Math.min(1, Number(saved.xRatio))),
        yRatio: Math.max(0, Math.min(1, Number(saved.yRatio))),
      };
    }

    const viewportWidth = Number(window.visualViewport?.width || window.innerWidth || 360);
    const viewportHeight = Number(window.visualViewport?.height || window.innerHeight || 720);
    const legacyX = Number(saved?.x ?? 18);
    const legacyY = Number(saved?.y ?? 130);

    return {
      xRatio: Math.max(0, Math.min(1, legacyX / Math.max(1, viewportWidth))),
      yRatio: Math.max(0, Math.min(1, legacyY / Math.max(1, viewportHeight))),
    };
  });`;

if (source.includes(oldInit)) {
  source = source.replace(oldInit, newInit);
} else if (!source.includes("xRatio") || !source.includes("yRatio")) {
  console.error("Could not find the AI position state initializer. No changes were written.");
  process.exit(1);
}

const oldSave =
  'useEffect(() => saveStore(STORE.aiPosition, position), [position]);';

const newSave = `useEffect(() => {
    saveStore(STORE.aiPosition, {
      xRatio: Math.max(0, Math.min(1, Number(position?.xRatio ?? 0.5))),
      yRatio: Math.max(0, Math.min(1, Number(position?.yRatio ?? 0.25))),
    });
  }, [position]);`;

if (source.includes(oldSave)) {
  source = source.replace(oldSave, newSave);
}

const oldClampRegex = /useEffect\(\(\) => \{\s*const clampToScreen = \(\) => \{[\s\S]*?\};\s*clampToScreen\(\);[\s\S]*?\}, \[activePage\]\);/;

const newClamp = `useEffect(() => {
    const clampToScreen = () => {
      const viewport = window.visualViewport;
      const viewportWidth = Number(viewport?.width || window.innerWidth || 360);
      const viewportHeight = Number(viewport?.height || window.innerHeight || 720);
      const offsetLeft = Number(viewport?.offsetLeft || 0);
      const offsetTop = Number(viewport?.offsetTop || 0);

      const buttonSize = viewportWidth <= 760 ? 58 : 66;
      const safeGap = 10;
      const reservedBottom =
        activePage === "trade" ? 92 : activePage === "botLive" ? 84 : 72;

      dragRef.current.bounds = {
        minX: offsetLeft + safeGap,
        maxX: Math.max(
          offsetLeft + safeGap,
          offsetLeft + viewportWidth - buttonSize - safeGap
        ),
        minY: offsetTop + safeGap,
        maxY: Math.max(
          offsetTop + safeGap,
          offsetTop + viewportHeight - buttonSize - reservedBottom
        ),
        viewportWidth,
        viewportHeight,
        offsetLeft,
        offsetTop,
      };

      setPosition((old) => ({
        xRatio: Math.max(0, Math.min(1, Number(old?.xRatio ?? 0.5))),
        yRatio: Math.max(0, Math.min(1, Number(old?.yRatio ?? 0.25))),
      }));
    };

    clampToScreen();
    window.addEventListener("resize", clampToScreen, { passive: true });
    window.addEventListener("orientationchange", clampToScreen, { passive: true });
    window.visualViewport?.addEventListener("resize", clampToScreen, { passive: true });
    window.visualViewport?.addEventListener("scroll", clampToScreen, { passive: true });

    return () => {
      window.removeEventListener("resize", clampToScreen);
      window.removeEventListener("orientationchange", clampToScreen);
      window.visualViewport?.removeEventListener("resize", clampToScreen);
      window.visualViewport?.removeEventListener("scroll", clampToScreen);
    };
  }, [activePage]);`;

if (oldClampRegex.test(source) && !source.includes("dragRef.current.bounds")) {
  source = source.replace(oldClampRegex, newClamp);
}

const oldPointerMoveRegex = /function pointerMove\(event\) \{[\s\S]*?\n  \}/;

const newPointerMove = `function pointerMove(event) {
    if (!dragRef.current.dragging) return;

    const viewport = window.visualViewport;
    const viewportWidth = Number(viewport?.width || window.innerWidth || 360);
    const viewportHeight = Number(viewport?.height || window.innerHeight || 720);
    const offsetLeft = Number(viewport?.offsetLeft || 0);
    const offsetTop = Number(viewport?.offsetTop || 0);
    const buttonSize = viewportWidth <= 760 ? 58 : 66;
    const safeGap = 10;
    const reservedBottom =
      activePage === "trade" ? 92 : activePage === "botLive" ? 84 : 72;

    const minX = offsetLeft + safeGap;
    const maxX = Math.max(minX, offsetLeft + viewportWidth - buttonSize - safeGap);
    const minY = offsetTop + safeGap;
    const maxY = Math.max(minY, offsetTop + viewportHeight - buttonSize - reservedBottom);

    const nextX = Math.max(
      minX,
      Math.min(maxX, event.clientX - dragRef.current.offsetX)
    );
    const nextY = Math.max(
      minY,
      Math.min(maxY, event.clientY - dragRef.current.offsetY)
    );

    setPosition({
      xRatio: (nextX - offsetLeft) / Math.max(1, viewportWidth),
      yRatio: (nextY - offsetTop) / Math.max(1, viewportHeight),
    });

    if (
      Math.abs(event.clientX - dragRef.current.startX) > 4 ||
      Math.abs(event.clientY - dragRef.current.startY) > 4
    ) {
      dragRef.current.moved = true;
    }
  }`;

if (oldPointerMoveRegex.test(source) && !source.includes("xRatio: (nextX - offsetLeft)")) {
  source = source.replace(oldPointerMoveRegex, newPointerMove);
}

const oldStyleOne = 'style={{ left: position.x, top: position.y }}';
const oldStyleTwo = 'style={{ left: `${position.x}px`, top: `${position.y}px` }}';

const newStyle = `style={{
          left: \`\${Math.max(
            10,
            Math.min(
              (window.visualViewport?.width || window.innerWidth) -
                ((window.visualViewport?.width || window.innerWidth) <= 760 ? 58 : 66) -
                10,
              Number(position?.xRatio ?? 0.5) *
                (window.visualViewport?.width || window.innerWidth)
            )
          )}px\`,
          top: \`\${Math.max(
            10,
            Math.min(
              (window.visualViewport?.height || window.innerHeight) -
                ((window.visualViewport?.width || window.innerWidth) <= 760 ? 58 : 66) -
                (activePage === "trade" ? 92 : activePage === "botLive" ? 84 : 72),
              Number(position?.yRatio ?? 0.25) *
                (window.visualViewport?.height || window.innerHeight)
            )
          )}px\`,
        }}`;

if (source.includes(oldStyleOne)) {
  source = source.replace(oldStyleOne, newStyle);
}
if (source.includes(oldStyleTwo)) {
  source = source.replace(oldStyleTwo, newStyle);
}

if (source === original) {
  console.log("Cross-device AI position fix is already installed. Nothing to change.");
  process.exit(0);
}

const backupPath = `${appPath}.before-ai-cross-device-v204.bak`;
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, original, "utf8");
}

fs.writeFileSync(appPath, source, "utf8");

console.log("MetaBinary V204 AI cross-device position fix installed.");
console.log("The current first-phone layout is untouched.");
console.log("AI position now scales by viewport percentage and clamps safely on every phone.");
console.log(`Backup: ${backupPath}`);

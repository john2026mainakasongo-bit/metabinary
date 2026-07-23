const fs = require("node:fs");
const path = require("node:path");

const appPath = path.join(process.cwd(), "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("src/App.jsx not found.");
  process.exit(1);
}

let source = fs.readFileSync(appPath, "utf8");
const original = source;

/* 1) Replace the exact current AI position initializer. */
source = source.replace(
  'const [position, setPosition] = useState(() => readStore(STORE.aiPosition, { x: 18, y: 130 }));',
  `const [position, setPosition] = useState(() => {
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

    const vw = Number(window.visualViewport?.width || window.innerWidth || 360);
    const vh = Number(window.visualViewport?.height || window.innerHeight || 720);

    return {
      xRatio: Math.max(0, Math.min(1, Number(saved?.x ?? 18) / Math.max(1, vw))),
      yRatio: Math.max(0, Math.min(1, Number(saved?.y ?? 130) / Math.max(1, vh))),
    };
  });`
);

/* 2) Save normalized values only. */
source = source.replace(
  'useEffect(() => saveStore(STORE.aiPosition, position), [position]);',
  `useEffect(() => {
    saveStore(STORE.aiPosition, {
      xRatio: Math.max(0, Math.min(1, Number(position?.xRatio ?? 0.5))),
      yRatio: Math.max(0, Math.min(1, Number(position?.yRatio ?? 0.25))),
    });
  }, [position]);`
);

/* 3) Replace current clamp effect exactly. */
const oldClamp = `  useEffect(() => {
    const clampToScreen = () => {
      const buttonSize = window.innerWidth <= 760 ? 58 : 66;
      const minY = Math.max(8, Number(window.visualViewport?.offsetTop || 0) + 8);
      const viewportHeight = Number(window.visualViewport?.height || window.innerHeight);
      const reservedBottom = activePage === "trade" ? 104 : activePage === "botLive" ? 92 : 78;
      const maxY = Math.max(minY, viewportHeight - buttonSize - reservedBottom);
      setPosition((old) => ({
        x: Math.max(8, Math.min(window.innerWidth - buttonSize - 8, Number(old?.x || window.innerWidth - buttonSize - 16))),
        y: Math.max(minY, Math.min(maxY, Number(old?.y || 130))),
      }));
    };
    clampToScreen();
    window.addEventListener("resize", clampToScreen, { passive: true });
    window.visualViewport?.addEventListener("resize", clampToScreen, { passive: true });
    return () => {
      window.removeEventListener("resize", clampToScreen);
      window.visualViewport?.removeEventListener("resize", clampToScreen);
    };
  }, [activePage]);`;

const newClamp = `  useEffect(() => {
    const clampToScreen = () => {
      setPosition((old) => ({
        xRatio: Math.max(0, Math.min(1, Number(old?.xRatio ?? 0.5))),
        yRatio: Math.max(0, Math.min(1, Number(old?.yRatio ?? 0.25))),
      }));
    };

    clampToScreen();
    window.addEventListener("resize", clampToScreen, { passive: true });
    window.addEventListener("orientationchange", clampToScreen, { passive: true });
    window.visualViewport?.addEventListener("resize", clampToScreen, { passive: true });

    return () => {
      window.removeEventListener("resize", clampToScreen);
      window.removeEventListener("orientationchange", clampToScreen);
      window.visualViewport?.removeEventListener("resize", clampToScreen);
    };
  }, [activePage]);`;

if (source.includes(oldClamp)) {
  source = source.replace(oldClamp, newClamp);
}

/* 4) Replace pointerDown so drag offset uses current rendered pixel position. */
const oldPointerDown = `  function pointerDown(event) {
    dragRef.current = {
      dragging: true,
      moved: false,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }`;

const newPointerDown = `  function pointerDown(event) {
    const rect = event.currentTarget.getBoundingClientRect();

    dragRef.current = {
      dragging: true,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
  }`;

if (source.includes(oldPointerDown)) {
  source = source.replace(oldPointerDown, newPointerDown);
}

/* 5) Replace pointerMove with normalized cross-device drag coordinates. */
const start = source.indexOf("  function pointerMove(event) {");
const end = source.indexOf("\n  function pointerUp()", start);

if (start !== -1 && end !== -1) {
  const newPointerMove = `  function pointerMove(event) {
    if (!dragRef.current.dragging) return;

    const distance = Math.hypot(
      event.clientX - dragRef.current.startX,
      event.clientY - dragRef.current.startY
    );

    if (distance < 5 && !dragRef.current.moved) return;
    dragRef.current.moved = true;

    const viewport = window.visualViewport;
    const vw = Number(viewport?.width || window.innerWidth || 360);
    const vh = Number(viewport?.height || window.innerHeight || 720);
    const offsetLeft = Number(viewport?.offsetLeft || 0);
    const offsetTop = Number(viewport?.offsetTop || 0);

    const buttonSize = vw <= 760 ? 58 : 66;
    const safeGap = 8;
    const reservedBottom =
      activePage === "trade" ? 90 :
      activePage === "botLive" ? 82 :
      68;

    const minX = offsetLeft + safeGap;
    const maxX = Math.max(minX, offsetLeft + vw - buttonSize - safeGap);

    const minY = offsetTop + safeGap;
    const maxY = Math.max(
      minY,
      offsetTop + vh - buttonSize - reservedBottom
    );

    const nextX = Math.max(
      minX,
      Math.min(maxX, event.clientX - dragRef.current.offsetX)
    );

    const nextY = Math.max(
      minY,
      Math.min(maxY, event.clientY - dragRef.current.offsetY)
    );

    setPosition({
      xRatio: (nextX - offsetLeft) / Math.max(1, vw),
      yRatio: (nextY - offsetTop) / Math.max(1, vh),
    });
  }`;

  source = source.slice(0, start) + newPointerMove + source.slice(end);
}

/* 6) Replace the exact current CSS-variable style object. */
const oldButtonStyle = `  const buttonStyle = {
    "--ai-x": \`\${Math.round(position.x)}px\`,
    "--ai-y": \`\${Math.round(position.y)}px\`,
  };`;

const newButtonStyle = `  const viewportWidth = Number(
    window.visualViewport?.width || window.innerWidth || 360
  );
  const viewportHeight = Number(
    window.visualViewport?.height || window.innerHeight || 720
  );
  const viewportLeft = Number(window.visualViewport?.offsetLeft || 0);
  const viewportTop = Number(window.visualViewport?.offsetTop || 0);
  const aiButtonSize = viewportWidth <= 760 ? 58 : 66;
  const aiReservedBottom =
    activePage === "trade" ? 90 :
    activePage === "botLive" ? 82 :
    68;

  const aiX = Math.max(
    viewportLeft + 8,
    Math.min(
      viewportLeft + viewportWidth - aiButtonSize - 8,
      viewportLeft + Number(position?.xRatio ?? 0.5) * viewportWidth
    )
  );

  const aiY = Math.max(
    viewportTop + 8,
    Math.min(
      viewportTop + viewportHeight - aiButtonSize - aiReservedBottom,
      viewportTop + Number(position?.yRatio ?? 0.25) * viewportHeight
    )
  );

  const buttonStyle = {
    "--ai-x": \`\${Math.round(aiX)}px\`,
    "--ai-y": \`\${Math.round(aiY)}px\`,
  };`;

if (source.includes(oldButtonStyle)) {
  source = source.replace(oldButtonStyle, newButtonStyle);
}

/* 7) Desktop scanner panel still needs pixel coordinates. */
source = source.replace(
  `  const panelStyle = mobileViewport ? undefined : {
    left: Math.min(position.x, Math.max(8, window.innerWidth - 390)),
    top: Math.min(position.y + 76, Math.max(90, window.innerHeight - 590)),
  };`,
  `  const panelStyle = mobileViewport ? undefined : {
    left: Math.min(aiX, Math.max(8, window.innerWidth - 390)),
    top: Math.min(aiY + 76, Math.max(90, window.innerHeight - 590)),
  };`
);

if (source === original) {
  console.error("No App.jsx changes were made. The current code did not match the expected AI implementation.");
  process.exit(1);
}

const backup = `${appPath}.before-v205-ai-exact.bak`;
if (!fs.existsSync(backup)) {
  fs.writeFileSync(backup, original, "utf8");
}

fs.writeFileSync(appPath, source, "utf8");

console.log("V205 exact AI cross-device fix installed successfully.");
console.log("Mobile trade layout was not changed.");
console.log("AI is now normalized by viewport and clamped above bottom navigation.");
console.log(`Backup: ${backup}`);

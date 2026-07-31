import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* METABINARY_V406B_ALL_PHONE_RUNTIME_FIT
   Measure the real mobile browser viewport and assign only the remaining
   vertical space to the digit chart. This avoids device/model-specific CSS.
*/
(function installMetaBinaryV406BMobileFit() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  let raf = 0;
  let resizeObserver = null;
  let mutationObserver = null;

  const q = (root, selector) => root?.querySelector?.(selector) || null;

  const measure = () => {
    raf = 0;

    const app = document.querySelector(
      "#root .app.activePage-trade:not(.riseFallActivePageV183)"
    );

    if (!app || window.matchMedia("(min-width: 761px)").matches) {
      document.documentElement.style.removeProperty("--mb-v406b-chart-h");
      return;
    }

    const chart = q(app, ".mobileDigitLiveChartV115");
    const digits =
      q(app, ".mbCleanDigitBoardV310") ||
      q(app, ".digitBoardNumbersOnlyV23.mobileDigitBoardFinalV130");
    const controls =
      q(app, ".proBinaryOrderCard.finalBinaryOrderCard") ||
      q(app, ".finalBinaryOrderCard");
    const buttons =
      q(app, ".proTradeButtons.finalTradeButtons") ||
      q(app, ".finalTradeButtons");
    const nav =
      q(app, ".bottomNav") ||
      document.querySelector("#root .bottomNav");

    if (!chart || !digits || !controls || !buttons || !nav) return;

    const chartRect = chart.getBoundingClientRect();
    const digitRect = digits.getBoundingClientRect();
    const controlsRect = controls.getBoundingClientRect();
    const buttonsRect = buttons.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();

    const visibleHeight =
      window.visualViewport?.height ||
      document.documentElement.clientHeight ||
      window.innerHeight;

    const viewportTop = window.visualViewport?.offsetTop || 0;
    const viewportBottom = viewportTop + visibleHeight;
    const navTop = Math.min(navRect.top, viewportBottom);

    const gapChartDigits = Math.max(
      0,
      Math.min(10, digitRect.top - chartRect.bottom)
    );

    const gapDigitsControls = Math.max(
      0,
      Math.min(10, controlsRect.top - digitRect.bottom)
    );

    const gapControlsButtons = Math.max(
      0,
      Math.min(10, buttonsRect.top - controlsRect.bottom)
    );

    const reservedBelowChart =
      digitRect.height +
      controlsRect.height +
      buttonsRect.height +
      gapChartDigits +
      gapDigitsControls +
      gapControlsButtons +
      6;

    let target = navTop - chartRect.top - reservedBelowChart;

    const vw = Math.max(320, Math.min(window.innerWidth || 390, 760));
    const minChart = vw <= 360 ? 175 : 195;
    const maxChart = Math.min(680, visibleHeight * 0.72);
    // METABINARY_V407_FILL_BOTTOM_GAP

    target = Math.max(minChart, Math.min(maxChart, target));

    if (Number.isFinite(target) && target > 0) {
      document.documentElement.style.setProperty(
        "--mb-v406b-chart-h",
        Math.round(target) + "px"
      );
    }
  };

  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);

    raf = requestAnimationFrame(() => {
      measure();
      requestAnimationFrame(measure);
    });
  };

  const observeCurrentTradeNodes = () => {
    try {
      resizeObserver?.disconnect();
      resizeObserver = new ResizeObserver(schedule);

      const app = document.querySelector(
        "#root .app.activePage-trade:not(.riseFallActivePageV183)"
      );
      if (!app) return;

      [
        app,
        app.querySelector(".mobileDigitLiveChartV115"),
        app.querySelector(".mbCleanDigitBoardV310"),
        app.querySelector(".finalBinaryOrderCard"),
        app.querySelector(".finalTradeButtons"),
        app.querySelector(".bottomNav"),
      ]
        .filter(Boolean)
        .forEach((node) => resizeObserver.observe(node));
    } catch {}
  };

  const boot = () => {
    schedule();
    observeCurrentTradeNodes();
  };

  window.addEventListener("resize", boot, { passive: true });
  window.addEventListener("orientationchange", boot, { passive: true });
  window.addEventListener("pageshow", boot, { passive: true });
  window.addEventListener("focus", boot, { passive: true });

  window.visualViewport?.addEventListener("resize", boot, { passive: true });
  window.visualViewport?.addEventListener("scroll", schedule, { passive: true });

  mutationObserver = new MutationObserver(() => {
    schedule();
    observeCurrentTradeNodes();
  });

  const startObserver = () => {
    const rootNode = document.getElementById("root");

    if (rootNode) {
      mutationObserver.observe(rootNode, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    boot();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    setTimeout(startObserver, 0);
  }
})();

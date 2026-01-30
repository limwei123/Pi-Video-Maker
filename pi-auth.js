// pi-auth.js — loads & initializes the Pi SDK safely (sandbox-friendly)
// Key idea: `window.Pi` may exist before the SDK is fully ready for `Pi.authenticate()`.
// We expose a *direct-click-safe* helper `window.piSignIn()` that refuses to auth until ready.
// When ready, it dispatches `window` event: `pi-sdk-ready`.

(function () {
  // Flags (persist across reloads inside the same webview)
  if (typeof window.__PI_SDK_INITED__ === "undefined") window.__PI_SDK_INITED__ = false;
  if (typeof window.__PI_SDK_READY__ === "undefined") window.__PI_SDK_READY__ = false;

  function markReadySoon() {
    // Pi SDK sometimes needs a short moment after init() before authenticate() is allowed.
    // We mark READY after a small delay and notify the page.
    if (window.__PI_SDK_READY__) return;
    setTimeout(() => {
      window.__PI_SDK_READY__ = true;
      try {
        window.dispatchEvent(new Event("pi-sdk-ready"));
      } catch (_) {}
      console.log("✅ Pi SDK ready (authenticate enabled)");
    }, 350);
  }

  function initPi() {
    if (!window.Pi || typeof window.Pi.init !== "function") return;

    // If init already called, just make sure we eventually mark ready
    if (window.__PI_SDK_INITED__) {
      markReadySoon();
      return;
    }

    try {
      window.Pi.init({ sandbox: true });
      window.__PI_SDK_INITED__ = true;
      console.log("🚀 Pi SDK init() called (Sandbox Mode)");
      markReadySoon();
    } catch (e) {
      console.error("❌ Pi SDK init error:", e);
    }
  }

  // If SDK already present, init now
  if (window.Pi) {
    initPi();
  } else {
    // Otherwise, inject the SDK script once
    const existing = document.querySelector('script[data-pi-sdk="1"]');
    if (existing) {
      existing.addEventListener("load", initPi);
    } else {
      const sdkScript = document.createElement("script");
      sdkScript.src = "https://sdk.minepi.com/pi-sdk.js";
      sdkScript.async = true;
      sdkScript.dataset.piSdk = "1";

      sdkScript.onload = () => {
        console.log("✅ Pi SDK script loaded (onload fired)");
        initPi();
      };

      sdkScript.onerror = () => {
        console.error("⚠️ Failed to load Pi SDK script");
      };

      document.head.appendChild(sdkScript);
    }
  }

  /**
   * Direct-click-safe sign-in helper.
   * IMPORTANT: call this directly inside the button click handler.
   * If not ready yet, it will *not* call authenticate (so it won't trigger the SDK error).
   */
  window.piSignIn = function (scopes) {
    const wantedScopes = scopes || ["username"];

    if (!window.Pi) {
      const err = new Error("Pi SDK not loaded yet. Please tap 'Reload Pi SDK' and try again.");
      console.error("❌", err);
      throw err;
    }

    // Ensure init is attempted
    initPi();

    // Refuse to auth until ready (keeps click 'direct' and avoids early-auth failures)
    if (!window.__PI_SDK_READY__) {
      const err = new Error("Pi SDK is still initializing. Wait 1 second and tap 'Sign in with Pi' again.");
      console.warn("⏳", err.message);
      throw err;
    }

    // Now safe to authenticate
    return window.Pi.authenticate(wantedScopes, () => {});
  };
})();

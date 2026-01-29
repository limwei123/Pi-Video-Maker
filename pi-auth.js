// pi-auth.js — loads & initializes the Pi SDK safely (sandbox-friendly)
(function () {
  // Avoid double-loading / double-init
  if (typeof window.__PI_SDK_INITED__ === "undefined") window.__PI_SDK_INITED__ = false;

  function initPi() {
    if (!window.Pi || !window.Pi.init) return;
    if (window.__PI_SDK_INITED__) return;

    try {
      window.Pi.init({ sandbox: true });
      window.__PI_SDK_INITED__ = true;
      console.log("🚀 Pi SDK initialized (Sandbox Mode)");
    } catch (e) {
      console.error("❌ Pi SDK init error:", e);
    }
  }

  // If SDK already present, just init
  if (window.Pi) {
    initPi();
    return;
  }

  // Otherwise, inject script once
  const existing = document.querySelector('script[data-pi-sdk="1"]');
  if (existing) {
    existing.addEventListener("load", initPi);
    return;
  }

  const sdkScript = document.createElement("script");
  sdkScript.src = "https://sdk.minepi.com/pi-sdk.js";
  sdkScript.async = true;
  sdkScript.dataset.piSdk = "1";

  sdkScript.onload = () => {
    console.log("✅ Pi SDK loaded successfully");
    initPi();
  };

  sdkScript.onerror = () => {
    console.error("⚠️ Failed to load Pi SDK");
  };

  document.head.appendChild(sdkScript);

  // Optional helper you can call from a button click:
  // window.piSignIn() must be called directly from onClick (no await before it).
  window.piSignIn = function (scopes) {
    if (!window.Pi) throw new Error("Pi SDK not ready");
    return window.Pi.authenticate(scopes || ["username"], () => {});
  };
})();

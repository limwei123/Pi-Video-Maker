// pi-auth.js - robust Pi SDK load + auth + payments + redirect
// Loaded by app.js at runtime. Requires Vercel serverless endpoints: /api/approve and /api/complete

(function () {
  const LOG_ID = "log";
  const STATUS_ID = "sdk-status";

  function el(id) { return document.getElementById(id); }
  function log(msg) {
    const box = el(LOG_ID);
    const ts = new Date().toLocaleTimeString();
    if (box) box.textContent = `[${ts}] ${msg}\n` + box.textContent;
    try { console.log("[PiAuth]", msg); } catch {}
  }
  function setStatus(text) {
    const s = el(STATUS_ID);
    if (s) s.textContent = text;
  }

  function isSandbox() {
    return String(window.location.hostname || "").includes("sandbox.minepi.com");
  }

  function ensurePiSdkScript() {
    // Pi Browser usually injects Pi, but sometimes loading fails.
    if (document.getElementById("pi-sdk-js")) return;
    const s = document.createElement("script");
    s.id = "pi-sdk-js";
    s.src = "https://sdk.minepi.com/pi-sdk.js";
    s.defer = true;
    s.onload = () => log("pi-sdk.js loaded.");
    s.onerror = () => log("pi-sdk.js failed to load.");
    document.head.appendChild(s);
    log("Injecting pi-sdk.js…");
  }

  async function waitForPi(timeoutMs = 15000) {
    const start = Date.now();

    if (window.Pi) return window.Pi;
    ensurePiSdkScript();

    while (Date.now() - start < timeoutMs) {
      await new Promise(r => setTimeout(r, 200));
      if (window.Pi) return window.Pi;
    }
    return null;
  }

  async function initPi() {
    setStatus("Loading…");
    const Pi = await waitForPi();

    if (!Pi) {
      setStatus("Pi SDK failed to load");
      log("Pi SDK not available after timeout.");
      return null;
    }

    const sandbox = isSandbox();
    try {
      Pi.init({ version: "2.0", sandbox });
      setStatus(`Pi SDK ready${sandbox ? " (sandbox)" : ""}`);
      log(`Pi.init ok (sandbox=${sandbox}).`);
      return Pi;
    } catch (e) {
      setStatus("Pi init failed");
      log("Pi.init error: " + (e && e.message ? e.message : String(e)));
      return null;
    }
  }

  async function postJson(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = { raw: txt }; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  window.PiAuth = {
    Pi: null,
    user: null,

    async init() {
      this.Pi = await initPi();
      return !!this.Pi;
    },

    async signIn() {
      const Pi = this.Pi || (await initPi());
      if (!Pi) return null;

      log("Sign-in clicked.");
      try {
        const auth = await Pi.authenticate(["username", "payments"], () => {});
        this.user = auth.user || null;
        log("Pi.authenticate ok.");
        return auth;
      } catch (e) {
        log("Pi.authenticate error: " + (e && e.message ? e.message : String(e)));
        return null;
      }
    },

    async pay({ amount = 1, memo = "Ultra Video Maker access" } = {}) {
      const Pi = this.Pi || (await initPi());
      if (!Pi) return { ok: false, error: "Pi SDK not loaded" };

      const paymentData = {
        amount,
        memo,
        metadata: { product: "ultra-video-maker" }
      };

      try {
        const payment = await Pi.createPayment(paymentData, {
          onReadyForServerApproval: async (paymentId) => {
            log("onReadyForServerApproval: " + paymentId);
            // MUST call your backend quickly, otherwise payment expires in ~60s
            await postJson("/api/approve", { paymentId });
            log("Approved (server).");
          },

          onReadyForServerCompletion: async (paymentId, txid) => {
            log("onReadyForServerCompletion: " + paymentId + " txid=" + txid);
            await postJson("/api/complete", { paymentId, txid });
            log("Completed (server).");
          },

          onCancel: (paymentId) => {
            log("Payment cancelled: " + paymentId);
          },

          onError: (error, payment) => {
            log("Payment error: " + (error && error.message ? error.message : String(error)));
            try { if (payment) log("Payment obj: " + JSON.stringify(payment)); } catch {}
          }
        });

        log("Pi.createPayment resolved.");
        return { ok: true, payment };
      } catch (e) {
        log("Pi.createPayment threw: " + (e && e.message ? e.message : String(e)));
        return { ok: false, error: e && e.message ? e.message : String(e) };
      }
    }
  };
})();

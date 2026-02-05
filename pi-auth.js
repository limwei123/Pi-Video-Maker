(function () {
  function $(id) { return document.getElementById(id); }

  function now() {
    try { return new Date().toLocaleTimeString(); } catch { return ""; }
  }

  function appendLog(msg) {
    const logEl = $("log");
    if (!logEl) return;
    logEl.textContent += `[${now()}] ${msg}\n`;
  }

  function setSdkStatus(msg) {
    const el = $("sdkStatus");
    if (el) el.textContent = msg;
  }

  function setUserLine(msg) {
    const el = $("userLine");
    if (el) el.textContent = msg;
  }

  function enable(btnId, yes) {
    const b = $(btnId);
    if (!b) return;
    b.disabled = !yes;
  }

  function isSandboxMode() {
    const q = new URLSearchParams(window.location.search);
    if (q.get("sandbox") === "1" || q.get("sandbox") === "true") return true;
    // When opened from the Pi sandbox portal, referrer is usually sandbox.minepi.com
    if (/sandbox\.minepi\.com/i.test(document.referrer || "")) return true;
    return false;
  }

  async function waitForPi(maxMs) {
    const start = Date.now();
    while (!window.Pi) {
      if (Date.now() - start > maxMs) return false;
      await new Promise(r => setTimeout(r, 100));
    }
    return true;
  }

  async function initPi() {
    setSdkStatus("Loading Pi SDK...");
    const ok = await waitForPi(20000); // sandbox can be slow
    if (!ok) {
      setSdkStatus("Pi SDK failed to load");
      appendLog("Pi SDK not found on window.Pi after timeout.");
      return false;
    }

    const sandbox = isSandboxMode();
    try {
      window.Pi.init({ version: "2.0", sandbox });
      setSdkStatus(sandbox ? "Pi SDK ready (sandbox)" : "Pi SDK ready");
      appendLog(`Pi.init ok (sandbox=${sandbox}).`);
      return true;
    } catch (e) {
      setSdkStatus("Pi SDK init error");
      appendLog("Pi.init error: " + (e && e.message ? e.message : String(e)));
      return false;
    }
  }

  let auth = null;

  async function signIn() {
    enable("signInBtn", false);
    setUserLine("Signing in...");
    appendLog("Sign-in clicked.");

    try {
      // Request username + payments permission
      auth = await window.Pi.authenticate(["username", "payments"], () => {});
      appendLog("Pi.authenticate ok.");
      const username = auth?.user?.username || "User";
      setUserLine(`Signed in as ${username}`);
      enable("payBtn", true);
    } catch (e) {
      auth = null;
      appendLog("Pi.authenticate failed: " + (e && e.message ? e.message : String(e)));
      setUserLine("Not signed in");
      enable("signInBtn", true);
    }
  }

  const BACKEND = "https://pi-payments-backend.vercel.app"; // your backend

  async function pay() {
    if (!auth) {
      appendLog("Pay blocked: not signed in.");
      return;
    }
    enable("payBtn", false);
    appendLog("Pay clicked.");

    try {
      const paymentData = { amount: 1, memo: "Ultra Video Maker access" };
      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          appendLog("onReadyForServerApproval: " + paymentId);
          await fetch(`${BACKEND}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId }),
          });
          appendLog("Server approve called.");
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          appendLog("onReadyForServerCompletion: " + paymentId + " txid=" + txid);
          await fetch(`${BACKEND}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });
          appendLog("Server complete called.");
        },
        onCancel: (paymentId) => {
          appendLog("Payment cancelled: " + paymentId);
          enable("payBtn", true);
        },
        onError: (error, payment) => {
          appendLog("Payment error: " + (error?.message || String(error)));
          if (payment?.identifier) appendLog("Payment id: " + payment.identifier);
          enable("payBtn", true);
        },
      };

      const payment = await window.Pi.createPayment(paymentData, callbacks);
      appendLog("createPayment returned: " + (payment?.identifier || "(no id)"));

      // If payment finished successfully, redirect
      // Some Pi SDK flows resolve with payment status; redirect when we can.
      // We'll do a small delay to allow callbacks to finish.
      setTimeout(() => {
        appendLog("Redirecting to /create-video");
        window.location.assign("/create-video");
      }, 800);

    } catch (e) {
      appendLog("createPayment exception: " + (e && e.message ? e.message : String(e)));
      enable("payBtn", true);
    }
  }

  async function bootstrap() {
    // Only run on payment page
    if (window.location.pathname === "/create-video") return;

    // If the HTML isn't rendered yet, wait a bit
    let tries = 0;
    while ((!$("signInBtn") || !$("payBtn")) && tries < 80) {
      await new Promise(r => setTimeout(r, 50));
      tries++;
    }
    if (!$("signInBtn")) return;

    // Bind clicks
    $("signInBtn").addEventListener("click", signIn);
    $("payBtn").addEventListener("click", pay);

    enable("signInBtn", false);
    enable("payBtn", false);

    const ok = await initPi();
    if (ok) enable("signInBtn", true);
    else enable("signInBtn", true); // let user try anyway (sometimes Pi appears late)
  }

  bootstrap();
})();
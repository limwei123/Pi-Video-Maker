(function () {
  const PI_AUTH_SCRIPT_ID = "pi-auth-script";
  if (document.getElementById(PI_AUTH_SCRIPT_ID)) return;

  function $(id) { return document.getElementById(id); }

  async function waitForElement(id, timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = $(id);
      if (el) return el;
      await new Promise(r => setTimeout(r, 50));
    }
    throw new Error("Element not found: " + id);
  }

  function now() {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
  }

  function appendLog(line) {
    try {
      const logEl = $("log");
      if (logEl) logEl.textContent += `[${now()}] ${line}\n`;
    } catch (_) {}
  }

  function setStatus(msg) {
    const statusEl = $("status");
    if (statusEl) statusEl.textContent = msg;
    appendLog(msg);
  }

  function getSandboxFlag() {
    const host = (location.hostname || "").toLowerCase();
    if (host.includes("sandbox.minepi.com")) return true;
    const qs = new URLSearchParams(location.search);
    if (qs.get("sandbox") === "1" || qs.get("sandbox") === "true") return true;
    return false;
  }

  function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(t));
  }

  async function postJson(url, body, accessToken) {
    const headers = { "Content-Type": "application/json" };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body || {})
    }, 20000);

    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  }

  async function waitForPiSdk(timeoutMs = 12000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.Pi && typeof window.Pi.init === "function") return true;
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  }

  (async function bootstrap() {
    const marker = document.createElement("div");
    marker.id = PI_AUTH_SCRIPT_ID;
    marker.style.display = "none";
    document.body.appendChild(marker);

    const signInBtn = await waitForElement("signinBtn");
    const payBtn = await waitForElement("payBtn");
    await waitForElement("status").catch(() => {});
    await waitForElement("log").catch(() => {});
    await waitForElement("userLine").catch(() => {});

    const BACKEND = (window.__BACKEND_URL__ || "https://pi-payments-backend.vercel.app").replace(/\/+$/, "");
    const sandbox = getSandboxFlag();

    let accessToken = null;
    let user = null;

    payBtn.disabled = true;

    setStatus("Loading Pi SDK...");
    const sdkOk = await waitForPiSdk();
    if (!sdkOk) {
      setStatus("Pi SDK failed to load");
      appendLog("Tip: Must open inside Pi Browser. If still failing, refresh once.");
      return;
    }

    try {
      window.Pi.init({ version: "2.0", sandbox });
      setStatus(`Pi SDK ready (${sandbox ? "sandbox" : "production"})`);
      appendLog(`Backend: ${BACKEND}`);
    } catch (e) {
      setStatus("Pi SDK init failed");
      appendLog(String(e && e.message ? e.message : e));
      return;
    }

    async function onIncompletePaymentFound(payment) {
      appendLog("Incomplete payment found: " + JSON.stringify(payment));
      try {
        await postJson(`${BACKEND}/incomplete`, { payment }, accessToken);
      } catch (e) {
        appendLog("Backend incomplete handler failed: " + e.message);
      }
    }

    signInBtn.onclick = async function () {
      try {
        setStatus("Signing in...");
        const auth = await window.Pi.authenticate(["username", "payments"], onIncompletePaymentFound);
        accessToken = auth && (auth.accessToken || auth.access_token) || null;
        user = auth && auth.user ? auth.user : null;

        const userLine = $("userLine");
        const uname = user && (user.username || user.uid || user.userName) ? (user.username || user.uid || user.userName) : "User";
        if (userLine) userLine.textContent = "Signed in as " + uname;

        appendLog("Pi.authenticate ok.");
        if (!accessToken) appendLog("Warning: accessToken missing from Pi.authenticate response.");

        payBtn.disabled = false;
        setStatus(`Signed in (${sandbox ? "sandbox" : "production"})`);
      } catch (e) {
        setStatus("Sign-in failed");
        appendLog(String(e && e.message ? e.message : e));
      }
    };

    payBtn.onclick = async function () {
      if (!user) {
        setStatus("Please sign in first");
        return;
      }
      setStatus("Starting payment...");
      payBtn.disabled = true;

      const paymentData = {
        amount: 1,
        memo: "Ultra Video Maker access",
        metadata: { product: "ultra_video_maker", ts: Date.now() }
      };

      try {
        await window.Pi.createPayment(paymentData, {
          onReadyForServerApproval: async function (paymentId) {
            appendLog("onReadyForServerApproval: " + paymentId);
            const body = { paymentId, sandbox, accessToken };

            try {
              await postJson(`${BACKEND}/approve`, body, accessToken);
              appendLog("Backend approve ok.");
            } catch (e) {
              appendLog("Backend approve failed: " + e.message);
              appendLog("Retrying approve once...");
              await postJson(`${BACKEND}/approve`, body, accessToken);
              appendLog("Backend approve ok (retry).");
            }
          },

          onReadyForServerCompletion: async function (paymentId, txid) {
            appendLog("onReadyForServerCompletion: " + paymentId + " txid=" + txid);
            const body = { paymentId, txid, sandbox, accessToken };
            try {
              await postJson(`${BACKEND}/complete`, body, accessToken);
              appendLog("Backend complete ok.");
              setStatus("Payment completed ✅ Redirecting...");
              location.assign("/create-video");
            } catch (e) {
              appendLog("Backend complete failed: " + e.message);
              setStatus("Payment complete failed (server)");
              payBtn.disabled = false;
            }
          },

          onCancel: function (paymentId) {
            appendLog("Payment cancelled: " + paymentId);
            setStatus("Payment cancelled");
            payBtn.disabled = false;
          },

          onError: function (error, payment) {
            appendLog("Payment error: " + (error && error.message ? error.message : String(error)));
            if (payment) appendLog("Payment object: " + JSON.stringify(payment));
            setStatus("Payment error");
            payBtn.disabled = false;
          }
        });
      } catch (e) {
        appendLog("createPayment threw: " + (e && e.message ? e.message : String(e)));
        setStatus("Payment failed to start");
        payBtn.disabled = false;
      }
    };
  })();
})();
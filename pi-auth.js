(function () {
  // Only run Pi auth/payment logic on the payment page ("/")
  // so the redirect page ("/create-video") doesn't break.
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  const isPaymentPage = (path === "/");
  if (!isPaymentPage) return;

  const statusEl = document.getElementById("status");
  const logEl = document.getElementById("log");
  const signInBtn = document.getElementById("signinBtn");
  const payBtn = document.getElementById("payBtn");
  const userLine = document.getElementById("userLine");

  // Extra guard: if required DOM is missing, do nothing.
  if (!statusEl || !logEl || !signInBtn || !payBtn || !userLine) return;

  const BACKEND = "https://pi-payments-backend.vercel.app";

  let currentUsername = null;

  function log(msg) {
    logEl.textContent += msg + "\n";
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  async function waitForPi() {
    while (!window.Pi) await new Promise((r) => setTimeout(r, 100));
  }

  async function init() {
    await waitForPi();

    // requirement #1: Pi SDK ready
    // requirement #2: Pi sign-in available
    // requirement #3: Pi payment available
    const isSandboxHost = /(^|\.)sandbox\.minepi\.com$/i.test(window.location.hostname);
  window.__UVM_IS_SANDBOX = isSandboxHost;
  Pi.init({ version: "2.0", sandbox: isSandboxHost });

    signInBtn.disabled = false;
    payBtn.disabled = true;

    setStatus("Pi SDK ready");
    log("Pi SDK ready");
  }

  async function checkPaid(username) {
    const res = await fetch(`${BACKEND}/api/user/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => ({}));
    return !!data.paid;
  }

  async function markPaid(username, paymentId, txid) {
    await fetch(`${BACKEND}/api/user/mark-paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, paymentId, txid }),
    }).catch(() => {});
  }

  async function signIn() {
    setStatus("Signing in…");

    try {
      const auth = await withTimeout(Pi.authenticate(getAuthScopes(), () => {}), 15000, "Sign-in");
      currentUsername = auth?.user?.username || null;

      userLine.textContent = "Signed in as: " + (currentUsername || "(unknown)");
      log("Signed in: " + (currentUsername || "(unknown)"));

      // Server-enforced one-time payment check
      setStatus("Checking payment status…");
      if (currentUsername) {
        const paid = await checkPaid(currentUsername);
        if (paid) {
          setStatus("Already paid ✅ Redirecting…");
          sessionStorage.setItem("uvm_paid", "1");
          window.location.assign("/create-video");
          return;
        }
      }

      setStatus("Not paid yet — please proceed with payment");
      payBtn.disabled = false;
    } catch (e) {
      setStatus("Sign-in cancelled");
      log("Sign-in error/cancel");
      currentUsername = null;
      payBtn.disabled = true;
    }
  }

  async function pay() {
    if (!currentUsername) {
      setStatus("Please sign in first");
      return;
    }

    setStatus("Creating payment…");

    try {
      await Pi.createPayment(
        {
          amount: 1,
          memo: "Ultra Video Maker Payment",
          metadata: { app: "UltraVideoMaker", username: currentUsername },
        },
        {
          onReadyForServerApproval: async (paymentId) => {
            await fetch(`${BACKEND}/api/pi/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId }),
            });
            log("Payment approved");
          },

          onReadyForServerCompletion: async (paymentId, txid) => {
            await fetch(`${BACKEND}/api/pi/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, txid }),
            });

            // Save paid user in KV (one-time unlock)
            await markPaid(currentUsername, paymentId, txid);

            log("Payment completed");
            setStatus("Payment successful ✅");

            // Redirect AFTER successful completion
            sessionStorage.setItem("uvm_paid", "1");
            window.location.assign("/create-video");
          },

          onCancel: () => {
            setStatus("Payment cancelled");
            log("Payment cancelled");
          },

          onError: (e) => {
            setStatus("Payment error");
            log("Payment error");
            console.error(e);
          },
        }
      );
    } catch (e) {
      setStatus("Payment failed");
      log("Payment failed");
    }
  }

  window.__piSignInClick = signIn;
  window.__piPayClick = pay;

  init();
})();

// --- Helpers for more reliable sandbox sign-in ---
function getAuthScopes() {
  return window.__UVM_IS_SANDBOX ? ["username"] : ["username", "payments"];
}
function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error((label || "Operation") + " timed out. Please try again.")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}
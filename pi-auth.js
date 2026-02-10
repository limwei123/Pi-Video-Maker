(function () {
  // Only run Pi auth/payment logic on the payment page ("/")
  // so the redirect page ("/create-video") doesn't break.
  const path = (window.location.pathname || "/").replace(/\/+$/, "") || "/";
  const isPaymentPage = (path === "/");

  // If we're not on the payment page, do nothing.
  if (!isPaymentPage) return;

  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const signInBtn = document.getElementById('signinBtn');
  const payBtn = document.getElementById('payBtn');
  const userLine = document.getElementById('userLine');

  // Extra guard: if required DOM is missing, do nothing.
  if (!statusEl || !logEl || !signInBtn || !payBtn || !userLine) return;

  const BACKEND = "https://pi-payments-backend.vercel.app";

  function log(msg) {
    logEl.textContent += msg + "\n";
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  async function waitForPi() {
    while (!window.Pi) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  function isLikelyPiBrowser() {
  const ua = navigator.userAgent || "";
  return /PiBrowser/i.test(ua) || /Pi Browser/i.test(ua);
}

async function init() {
    await waitForPi();
    // requirement #1: Pi SDK ready
    // requirement #2: Pi sign-in available
    // requirement #3: Pi payment available
    Pi.init({ version: "2.0", sandbox: true });

    signInBtn.disabled = false;
    setStatus("Pi SDK ready");
    log("Pi SDK ready");

    if (!isLikelyPiBrowser()) {
      log("Tip: Pi sign-in & payment only work inside Pi Browser. For Chrome testing, use ?web=1 mode.");
    }
  }

  async function signIn() {
    setStatus("Signing in…");

    try {
      const auth = await Pi.authenticate(["username","payments"], () => {});
      userLine.textContent = "Signed in as: " + auth.user.username;
      setStatus("Signed in");
      payBtn.disabled = false;
      log("Signed in: " + auth.user.username);
    } catch (e) {
      setStatus(e && e.message === "AUTH_TIMEOUT" ? "Sign-in not responding. Open this app inside Pi Browser, and make sure your Pi Developer Portal App URL includes this domain." : "Sign-in cancelled");
      log("Sign-in error");
    }
  }

  async function pay() {
    setStatus("Creating payment…");

    try {
      await Pi.createPayment({
        amount: 1,
        memo: "Ultra Video Maker Payment",
        metadata: { app: "UltraVideoMaker" }
      }, {
        onReadyForServerApproval: async (paymentId) => {
          await fetch(`${BACKEND}/api/pi/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId })
          });
          log("Payment approved");
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          await fetch(`${BACKEND}/api/pi/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid })
          });
          log("Payment completed");
          setStatus("Payment successful ✅");

          // Redirect AFTER successful completion (your new requirement)
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
        }
      });
    } catch (e) {
      setStatus("Payment failed");
      log("Payment failed");
    }
  }

  window.__piSignInClick = signIn;
  window.__piPayClick = pay;

  init();
})();
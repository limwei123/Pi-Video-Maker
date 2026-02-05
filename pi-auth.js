(function () {
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const signInBtn = document.getElementById('signinBtn');
  const payBtn = document.getElementById('payBtn');
  const userLine = document.getElementById('userLine');

  const BACKEND = "https://pi-payments-backend.vercel.app";

  // After a successful payment, redirect user to your video creation app/page.
  // Change this to your real page (relative or full URL).
  const REDIRECT_AFTER_PAYMENT = "./create.html";

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

  async function init() {
    await waitForPi();
    Pi.init({ version: "2.0", sandbox: true });

    signInBtn.disabled = false;
    setStatus("Pi SDK ready");
    log("Pi SDK ready");
  }

  async function signIn() {
    setStatus("Signing in…");

    try {
      const auth = await Pi.authenticate(["username"], () => {});
      userLine.textContent = "Signed in as: " + auth.user.username;
      setStatus("Signed in");
      payBtn.disabled = false;
      log("Signed in: " + auth.user.username);
    } catch (e) {
      setStatus("Sign-in cancelled");
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
          const res = await fetch(`${BACKEND}/api/pi/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId })
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Approve failed: ${res.status} ${txt}`);
          }

          log("Payment approved");
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          const res = await fetch(`${BACKEND}/api/pi/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid })
          });

          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            throw new Error(`Complete failed: ${res.status} ${txt}`);
          }

          log("Payment completed");
          setStatus("Payment successful ✅");

          // Mark payment success (so the next page can check it) and redirect.
          try { sessionStorage.setItem("pi_payment_success", "1"); } catch (_) {}
          setTimeout(() => { window.location.href = REDIRECT_AFTER_PAYMENT; }, 600);
        },

        onCancel: () => {
          setStatus("Payment cancelled");
          log("Payment cancelled");
        },

        onError: (e) => {
          setStatus("Payment error");
          log("Payment error: " + (e?.message || e));
          console.error(e);
        }
      });
    } catch (e) {
      setStatus("Payment failed");
      log("Payment failed: " + (e?.message || e));
      console.error(e);
    }
  }

  window.__piSignInClick = signIn;
  window.__piPayClick = pay;

  init();
})();
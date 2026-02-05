(function () {
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const signInBtn = document.getElementById('signinBtn');
  const payBtn = document.getElementById('payBtn');
  const userLine = document.getElementById('userLine');

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
      const auth = await Pi.authenticate(["username","payments"], () => {});
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
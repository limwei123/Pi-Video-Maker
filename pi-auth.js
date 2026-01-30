(function () {
  const BACKEND_BASE = "https://pi-payments-backend.vercel.app";

  const statusEl = document.getElementById("status");
  const logEl = document.getElementById("log");
  const signInBtn = document.getElementById("signinBtn");
  const payBtn = document.getElementById("payBtn");
  const userLine = document.getElementById("userLine");

  function log(msg) {
    if (logEl) logEl.textContent += msg + "\n";
  }
  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  async function initPi() {
    if (!window.Pi) {
      setStatus("Pi SDK not loaded ❌");
      return;
    }
    Pi.init({ version: "2.0", sandbox: true });
    setStatus("Pi SDK ready ✅");
    signInBtn.disabled = false;
  }

  window.__piSignInClick = function () {
    setStatus("Signing in…");

    Pi.authenticate(["username"], () => {})
      .then(async (auth) => {
        const username = auth.user.username;
        const accessToken = auth.accessToken;

        userLine.textContent = "Signed in as: " + username;
        setStatus("Sending auth to backend…");

        const res = await fetch(`${BACKEND_BASE}/api/pi/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken, username })
        });

        const data = await res.json();
        log(JSON.stringify(data, null, 2));

        if (res.ok) {
          setStatus("Backend approved ✅");
          payBtn.disabled = false;
        } else {
          setStatus("Backend error ❌");
        }
      })
      .catch((err) => {
        setStatus("Sign-in cancelled");
        console.error(err);
      });
  };

  window.__piPayClick = async function () {
    setStatus("Completing payment…");

    const res = await fetch(`${BACKEND_BASE}/api/pi/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1 })
    });

    const data = await res.json();
    log(JSON.stringify(data, null, 2));

    if (res.ok) {
      setStatus("Payment completed ✅");
    } else {
      setStatus("Payment failed ❌");
    }
  };

  initPi();
})();

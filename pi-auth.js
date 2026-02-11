(function () {
  // Runs on the payment screen wherever it is hosted:
  // - Vercel production: https://pi-video-maker.vercel.app/
  // - Pi Sandbox: https://sandbox.minepi.com/app/<app-slug>
  //
  // We detect the screen by DOM presence (buttons/status/log).
  const statusEl = document.getElementById("status");
  const logEl = document.getElementById("log");
  const signInBtn = document.getElementById("signinBtn");
  const payBtn = document.getElementById("payBtn");
  const userLine = document.getElementById("userLine");

  // If required DOM is missing, this page isn't the payment screen.
  if (!statusEl || !logEl || !signInBtn || !payBtn || !userLine) return;

  // Backend base (Pi payments backend on Vercel)
  const BACKEND = "https://pi-payments-backend.vercel.app";

  // Detect whether we are inside Pi Sandbox host
  const isSandboxHost = /(^|\.)sandbox\.minepi\.com$/i.test(window.location.hostname);

  // Pi Sandbox often embeds your hosted app (e.g., Vercel) in a wrapper/iframe.
  // In that case, hostname is NOT sandbox.minepi.com, so also detect by:
  // - document.referrer (wrapper origin)
  // - ancestorOrigins (Chrome)
  // - /app/<slug> path (if directly served under sandbox)
  const ref = document.referrer || "";
  const isSandboxReferrer = /(^|\/\/)sandbox\.minepi\.com(\/|$)/i.test(ref);

  const ao = window.location.ancestorOrigins ? Array.from(window.location.ancestorOrigins) : [];
  const isSandboxAncestor = ao.some((o) => /(^|\/\/)sandbox\.minepi\.com(\/|$)/i.test(String(o)));

  const isSandboxPath = /^\/app\/[^\/]+(?:\/|$)/i.test(window.location.pathname || "/");

  const isSandbox = isSandboxHost || isSandboxReferrer || isSandboxAncestor || isSandboxPath;


  // Build an app base path so redirects work both on:
  // - Vercel (base = "")
  // - Pi Sandbox (base = "/app/<slug>")
  function getAppBasePath() {
    const p = window.location.pathname || "/";
    const m = p.match(/^\/(app\/[^\/]+)(?:\/|$)/);
    return m ? "/" + m[1] : "";
  }

  function redirectToCreate() {
    const base = getAppBasePath();
    const target = (base ? base : "") + "/create-video";
    window.location.assign(target);
  }

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
    Pi.init({ version: "2.0", sandbox: isSandbox });

    signInBtn.disabled = false;
    payBtn.disabled = true;

    setStatus("Pi SDK ready");
    log("Pi SDK ready");
    log(isSandbox ? "Mode: SANDBOX" : "Mode: PRODUCTION");
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
      const auth = await Pi.authenticate(["username", "payments"], () => {});
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
          redirectToCreate();
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
            redirectToCreate();
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

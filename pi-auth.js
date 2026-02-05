(function () {
  async function waitForElement(id) {
    let el = document.getElementById(id);
    while (!el) {
      await new Promise(r => setTimeout(r, 50));
      el = document.getElementById(id);
    }
    return el;
  }

  async function bootstrap() {
    const statusEl = await waitForElement('status');
    const logEl = await waitForElement('log');
    const signInBtn = await waitForElement('signinBtn');
    const payBtn = await waitForElement('payBtn');
    const userLine = await waitForElement('userLine');

    const BACKEND = "https://pi-payments-backend.vercel.app";

    function log(msg) {
      logEl.textContent += msg + "\n";
    }

    function setStatus(msg) {
      statusEl.textContent = msg;
    }

    async function waitForPi(timeoutMs = 15000) {
      const start = Date.now();
      while (!window.Pi) {
        if (Date.now() - start > timeoutMs) {
          throw new Error("Pi SDK not loaded");
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }

    function detectSandbox() {
      // In Pi Sandbox, your app is usually inside an iframe under sandbox.minepi.com
      // so location.hostname is still your domain (e.g. *.vercel.app).
      const host = window.location.hostname;
      const qs = new URLSearchParams(window.location.search);
      const fromQuery = (qs.get("sandbox") || qs.get("pi_sandbox") || "").toLowerCase();
      const viaAncestor = Array.from(window.location.ancestorOrigins || []).some(o => o.includes("sandbox.minepi.com"));
      return host.includes("sandbox.minepi.com") || viaAncestor || fromQuery === "1" || fromQuery === "true";
    }

    async function init() {
      try {
        await waitForPi();
        const isSandbox = detectSandbox();
        Pi.init({ version: "2.0", sandbox: isSandbox });

        signInBtn.disabled = false;
        setStatus(isSandbox ? "Pi SDK ready (sandbox)" : "Pi SDK ready");
        log("Pi.init ok (sandbox=" + isSandbox + ").");
      } catch (e) {
        setStatus("Pi SDK failed to load");
        log("Pi SDK failed to load. Open inside Pi Browser / Sandbox.");
        console.error(e);
      }
    }

    async function signIn() {
      setStatus("Signing in…");

      try {
        log("Sign-in clicked.");
        const auth = await Pi.authenticate(["username","payments"], () => {});
        userLine.textContent = "Signed in as: " + auth.user.username;
        setStatus("Signed in");
        payBtn.disabled = false;
        log("Pi.authenticate ok.");
      } catch (e) {
        setStatus("Sign-in cancelled");
        log("Sign-in error: " + (e?.message || String(e)));
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
            log("onReadyForServerApproval: " + paymentId);
            const res = await fetch(`${BACKEND}/api/pi/approve`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId })
            });
            const txt = await res.text().catch(() => "");
            log("approve status=" + res.status + (txt ? (" body=" + txt.slice(0, 120)) : ""));
          },

          onReadyForServerCompletion: async (paymentId, txid) => {
            log("onReadyForServerCompletion: " + paymentId + " txid=" + txid);
            const res = await fetch(`${BACKEND}/api/pi/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, txid })
            });
            const txt = await res.text().catch(() => "");
            log("complete status=" + res.status + (txt ? (" body=" + txt.slice(0, 120)) : ""));
            setStatus("Payment successful ✅");
            // Use relative path so it works in sandbox + prod.
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
  }

  bootstrap();
})();

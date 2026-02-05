(function () {
  async function waitForElement(id) {
    let el = document.getElementById(id);
    while (!el) {
      await new Promise((r) => setTimeout(r, 50));
      el = document.getElementById(id);
    }
    return el;
  }

  function isSandboxEnv() {
    // When opened inside the Pi Sandbox, either the referrer or URL usually contains sandbox.minepi.com
    return (
      (document.referrer || "").includes("sandbox.minepi.com") ||
      (window.location.href || "").includes("sandbox.minepi.com")
    );
  }

  async function bootstrap() {
    const statusEl = await waitForElement("status");
    const logEl = document.getElementById("log");
    const signInBtn = await waitForElement("signinBtn");
    const payBtn = await waitForElement("payBtn");

    const BACKEND = "https://pi-payments-backend.vercel.app";

    function log(msg) {
      if (!logEl) return;
      logEl.textContent += msg + "\n";
    }

    function setStatus(msg) {
      statusEl.textContent = msg;
      log("[" + new Date().toLocaleTimeString() + "] " + msg);
    }

    async function waitForPi(timeoutMs = 15000) {
      const start = Date.now();
      while (!window.Pi) {
        if (Date.now() - start > timeoutMs) return false;
        await new Promise((r) => setTimeout(r, 100));
      }
      return true;
    }

    async function postJSON(path, body, accessToken) {
      const res = await fetch(BACKEND + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error("Backend " + path + " failed: " + res.status + " " + text);
      }

      // Some endpoints may return JSON or empty.
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) return await res.json();
      return await res.text().catch(() => "");
    }

    let accessToken = null;

    async function init() {
      setStatus("Loading...");

      const ok = await waitForPi();
      if (!ok) {
        setStatus("Pi SDK failed to load");
        signInBtn.disabled = true;
        payBtn.disabled = true;
        return;
      }

      const sandbox = isSandboxEnv();
      Pi.init({ version: "2.0", sandbox });
      setStatus(sandbox ? "Pi SDK ready (sandbox)" : "Pi SDK ready");

      signInBtn.disabled = false;
      payBtn.disabled = true;
    }

    async function signIn() {
      try {
        setStatus("Signing in...");

        const auth = await Pi.authenticate(["username", "payments"], () => {});
        // Pi SDK returns an auth object; accessToken is commonly present.
        accessToken = auth && (auth.accessToken || auth.access_token) ? (auth.accessToken || auth.access_token) : null;

        window.piUser = auth.user;
        setStatus("Signed in as " + auth.user.username);
        payBtn.disabled = false;
      } catch (e) {
        console.error(e);
        setStatus("Sign in failed");
      }
    }

    async function pay() {
      try {
        setStatus("Starting payment...");

        await Pi.createPayment(
          {
            amount: 1,
            memo: "Ultra Video Maker",
            metadata: { type: "video" },
          },
          {
            onReadyForServerApproval: async (paymentId) => {
              setStatus("Approving payment...");
              await postJSON(
                "/api/pi/approve",
                { paymentId, sandbox: isSandboxEnv() },
                accessToken
              );
              setStatus("Approved. Waiting for completion...");
            },
            onReadyForServerCompletion: async (paymentId, txid) => {
              setStatus("Completing payment...");
              await postJSON(
                "/api/pi/complete",
                { paymentId, txid, sandbox: isSandboxEnv() },
                accessToken
              );
              setStatus("Payment successful! Redirecting...");
              // Redirect into the video creating app route
              window.location.assign("/create-video");
            },
            onCancel: () => setStatus("Payment cancelled"),
            onError: (err) => {
              console.error(err);
              setStatus("Payment error");
            },
          }
        );
      } catch (e) {
        console.error(e);
        setStatus("Payment failed");
      }
    }

    window.__piSignInClick = signIn;
    window.__piPayClick = pay;

    signInBtn.addEventListener("click", signIn);
    payBtn.addEventListener("click", pay);

    init();
  }

  bootstrap();
})();

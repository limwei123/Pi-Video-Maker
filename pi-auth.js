
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
    const signInBtn = await waitForElement('signinBtn');
    const payBtn = await waitForElement('payBtn');

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

      const isSandbox =
        document.referrer.includes("sandbox.minepi.com") ||
        window.location.href.includes("sandbox.minepi.com");

      Pi.init({ version: "2.0", sandbox: isSandbox });

      signInBtn.disabled = false;
      setStatus("Pi SDK ready");
    }

    async function signIn() {
      try {
        setStatus("Signing in...");
        const auth = await Pi.authenticate(["username", "payments"], () => {});
        window.piUser = auth.user;
        setStatus("Signed in as " + auth.user.username);
        payBtn.disabled = false;
      } catch (e) {
        setStatus("Sign in failed");
        console.error(e);
      }
    }

    async function pay() {
      try {
        const payment = await Pi.createPayment({
          amount: 1,
          memo: "Ultra Video Maker",
          metadata: { type: "video" }
        }, {
          onReadyForServerApproval: async (paymentId) => {
            await fetch("https://pi-payments-backend.vercel.app/api/pi/approve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId })
            });
          },
          onReadyForServerCompletion: async (paymentId, txid) => {
            await fetch("https://pi-payments-backend.vercel.app/api/pi/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, txid })
            });
            setStatus("Payment successful");
            // Redirect to the video creation page after successful payment
            try {
              setStatus("Redirecting…");
              setTimeout(() => {
                window.location.assign("https://pi-video-maker.vercel.app/create-video");
              }, 300);
            } catch (e) {
              log("Redirect failed: " + (e && e.message ? e.message : e));
              log("Open manually: https://pi-video-maker.vercel.app/create-video");
            }
          },
          onCancel: () => setStatus("Payment cancelled"),
          onError: (err) => {
            setStatus("Payment error");
            console.error(err);
          }
        });
      } catch (e) {
        console.error(e);
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

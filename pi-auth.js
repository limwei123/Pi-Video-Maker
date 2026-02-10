
/*
  Pi Auth + Pay once unlock

  Requirements:
  1) Pi SDK ready
  2) Sign in
  3) Payment approve/complete via your backend
  4) Payment saved (one time) using your backend (Upstash KV) + local fallback

  Backend endpoints expected:
   - POST {BACKEND}/api/user/status        body: { username } -> { paid: boolean }
   - POST {BACKEND}/api/user/mark-paid     body: { username } -> { ok: true }
   - POST {BACKEND}/api/pi/approve         body: { paymentId, txid } OR per your existing code
   - POST {BACKEND}/api/pi/complete        body: { paymentId, txid } OR per your existing code

  If you already deployed a backend, set it once:
    localStorage.setItem("UVM_BACKEND", "https://YOUR-BACKEND.vercel.app");
*/

(function () {
  const STATUS_EL = () => document.getElementById("status");
  const USERLINE_EL = () => document.getElementById("userLine");
  const PAIDLINE_EL = () => document.getElementById("paidLine");
  const LOG_EL = () => document.getElementById("log");
  const SIGNIN_BTN = () => document.getElementById("signinBtn");
  const PAY_BTN = () => document.getElementById("payBtn");

  function setStatusDot(ok, bad){
    const el = STATUS_EL();
    if (!el) return;
    const dot = el.querySelector(".dot");
    if (!dot) return;
    dot.classList.remove("ok","bad");
    if (ok) dot.classList.add("ok");
    if (bad) dot.classList.add("bad");
  }

  function setStatusText(text){
    const el = STATUS_EL();
    if (!el) return;
    const spans = el.querySelectorAll("span");
    if (spans.length >= 2) spans[1].textContent = text;
  }

  function log(msg){
    const el = LOG_EL();
    if (!el) return;
    el.textContent = (el.textContent ? el.textContent + "\n" : "") + msg;
  }

  function getBackend(){
    const fromLS = localStorage.getItem("UVM_BACKEND");
    if (fromLS) return fromLS;
    // fallback guess - user can override in LS
    return "https://pi-payments-backend.vercel.app";
  }

  async function postJSON(url, body){
    const res = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body || {})
    });
    const txt = await res.text();
    let data = null;
    try{ data = JSON.parse(txt); } catch(e){}
    if (!res.ok){
      const msg = data?.error || data?.message || txt || ("HTTP " + res.status);
      throw new Error(msg);
    }
    return data || {};
  }

  function showPaidUI(){
    const paidLine = PAIDLINE_EL();
    if (paidLine) paidLine.style.display = "inline-flex";
    const payBtn = PAY_BTN();
    if (payBtn) payBtn.disabled = true;
  }

  function setUser(username){
    const el = USERLINE_EL();
    if (el) el.textContent = username ? ("Signed in as: " + username) : "Not signed in";
  }

  function enableSignIn(){
    const btn = SIGNIN_BTN();
    if (btn) btn.disabled = false;
  }

  function enablePay(enable){
    const btn = PAY_BTN();
    if (btn) btn.disabled = !enable;
  }

  // ---- Main flow ----

  async function waitForPiSDK(){
    setStatusText("Loading Pi SDK…");
    for (let i=0;i<80;i++){
      if (window.Pi && typeof window.Pi.init === "function") return true;
      await new Promise(r=>setTimeout(r, 100));
    }
    return false;
  }

  async function checkPaid(username){
    // local fallback
    const localKey = "UVM_PAID_" + username;
    if (localStorage.getItem(localKey) === "1") return true;

    const backend = getBackend();
    const data = await postJSON(backend + "/api/user/status", { username });
    if (data && data.paid){
      localStorage.setItem(localKey, "1");
      return true;
    }
    return false;
  }

  async function markPaid(username){
    const backend = getBackend();
    await postJSON(backend + "/api/user/mark-paid", { username });
    const localKey = "UVM_PAID_" + username;
    localStorage.setItem(localKey, "1");
  }

  async function init(){
    const ok = await waitForPiSDK();
    if (!ok){
      setStatusDot(false, true);
      setStatusText("Pi SDK failed to load.");
      log("Pi SDK not ready. Check internet / Pi Browser.");
      return;
    }

    window.Pi.init({ version: "2.0" });
    setStatusDot(true, false);
    setStatusText("Pi SDK ready ✅");
    enableSignIn();

    // If already signed in this session, restore
    const savedUser = sessionStorage.getItem("UVM_USER");
    if (savedUser){
      setUser(savedUser);
      try{
        const paid = await checkPaid(savedUser);
        if (paid){
          showPaidUI();
          setStatusText("Paid access: unlocked ✅");
          // If user is on /, we can auto redirect
          if (window.location.pathname === "/") {
            setTimeout(()=>{ window.location.href = "/create-video"; }, 400);
          }
        } else {
          setStatusText("Signed in. Payment required.");
          enablePay(true);
        }
      }catch(e){
        setStatusText("Signed in. (Cannot verify paid status)");
        enablePay(true);
        log("Status check failed: " + e.message);
      }
    }
  }

  async function signIn(){
    try{
      setStatusText("Signing in…");
      const auth = await window.Pi.authenticate(["username"], (payment) => {
        // onIncompletePaymentFound - we could handle retries here
        log("Found incomplete payment: " + JSON.stringify(payment));
      });

      const username = auth?.user?.username || auth?.user?.uid || auth?.username;
      if (!username) throw new Error("No username returned from Pi.");
      sessionStorage.setItem("UVM_USER", username);
      setUser(username);

      // Save token if present (optional)
      if (auth?.accessToken) sessionStorage.setItem("UVM_ACCESS_TOKEN", auth.accessToken);

      // Check paid
      try{
        const paid = await checkPaid(username);
        if (paid){
          showPaidUI();
          setStatusText("Paid access: unlocked ✅");
          if (window.location.pathname === "/") window.location.href = "/create-video";
        } else {
          setStatusText("Signed in ✅ Payment required.");
          enablePay(true);
        }
      }catch(e){
        setStatusText("Signed in ✅ (status check failed)");
        enablePay(true);
        log("Status check failed: " + e.message);
      }
    }catch(e){
      setStatusDot(false, true);
      setStatusText("Sign-in failed.");
      log("Sign-in error: " + e.message);
    }
  }

  async function pay(){
    try{
      const username = sessionStorage.getItem("UVM_USER");
      if (!username){
        setStatusText("Please sign in first.");
        return;
      }

      // Final re-check: if already paid, don't charge again
      try{
        const paid = await checkPaid(username);
        if (paid){
          showPaidUI();
          setStatusText("Already unlocked ✅");
          window.location.href = "/create-video";
          return;
        }
      }catch(e){}

      setStatusText("Opening Pi payment…");
      enablePay(false);

      const paymentData = {
        amount: 1,
        memo: "Ultra Video Maker unlock (one-time)",
        metadata: { productId: "uvm_unlock_v1", username }
      };

      const backend = getBackend();

      const payment = await window.Pi.createPayment(paymentData, {
        onReadyForServerApproval: async (paymentId) => {
          log("PaymentId: " + paymentId + " (approve)");
          await postJSON(backend + "/api/pi/approve", { paymentId, username });
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          log("PaymentId: " + paymentId + " (complete) txid=" + txid);
          await postJSON(backend + "/api/pi/complete", { paymentId, txid, username });

          // Mark paid in KV (our own record)
          await markPaid(username);

          setStatusDot(true, false);
          setStatusText("Payment verified ✅ Redirecting…");
          showPaidUI();
          setTimeout(()=>{ window.location.href = "/create-video"; }, 500);
        },
        onCancel: (paymentId) => {
          setStatusText("Payment cancelled.");
          enablePay(true);
          log("Cancelled: " + paymentId);
        },
        onError: (err, payment) => {
          setStatusDot(false, true);
          setStatusText("Payment error.");
          enablePay(true);
          log("Payment error: " + (err?.message || String(err)));
          if (payment) log("Payment: " + JSON.stringify(payment));
        },
      });

      // In some SDK versions, createPayment returns immediately; callbacks handle the rest.
      log("Payment started.");
    }catch(e){
      setStatusDot(false, true);
      setStatusText("Payment failed.");
      enablePay(true);
      log("Payment exception: " + e.message);
    }
  }

  // Hook buttons
  window.__piSignInClick = signIn;
  window.__piPayClick = pay;

  // Start init when DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

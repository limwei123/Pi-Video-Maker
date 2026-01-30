// pi-auth.js — v6 (Auth + Payments)
// Keeps the working "do not overwrite injected Pi bridge" approach.
// Adds Pi payments via Pi.createPayment + backend approval/completion.
// Docs: Pi SDK createPayment callbacks require server-side approve/complete. (see Pi Developer Guide)
(function () {
  const envEl = document.getElementById('env');
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const signInBtn = document.getElementById('signinBtn');
  const payBtn = document.getElementById('payBtn');
  const userLine = document.getElementById('userLine');
  const backendInput = document.getElementById('backendUrl');

  function ts() { return new Date().toISOString().slice(11, 19); }
  function log(msg) { if (logEl) logEl.textContent += `[${ts()}] ${msg}\n`; }
  function setStatus(msg) { if (statusEl) statusEl.textContent = msg; }
  function renderEnv() {
    if (!envEl) return;
    envEl.textContent =
      `hostname: ${location.hostname}\n` +
      `href: ${location.href}\n` +
      `userAgent: ${navigator.userAgent}\n` +
      `window.Pi: ${window.Pi ? 'YES' : 'NO'}`;
  }

  // Persist backend base URL (device local)
  const LS_KEY = 'pi_backend_base_url_v6';
  function getBackendBaseUrl() {
    const v = (backendInput && backendInput.value) ? backendInput.value.trim() : (localStorage.getItem(LS_KEY) || '').trim();
    return v.replace(/\/+$/, ''); // trim trailing slashes
  }
  function saveBackendBaseUrl() {
    if (!backendInput) return;
    const v = backendInput.value.trim();
    localStorage.setItem(LS_KEY, v);
    log('Saved backend URL: ' + v);
  }
  if (backendInput) {
    const saved = (localStorage.getItem(LS_KEY) || '').trim();
    if (saved) backendInput.value = saved;
    backendInput.addEventListener('change', saveBackendBaseUrl);
    backendInput.addEventListener('blur', saveBackendBaseUrl);
  }

  if (!window.__PI_STATE__) window.__PI_STATE__ = { inited: false, ready: false, auth: null };
  const state = window.__PI_STATE__;

  function waitForPi(timeoutMs = 10000) {
    const start = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        renderEnv();
        if (window.Pi) return resolve(true);
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  async function init() {
    renderEnv();
    if (signInBtn) signInBtn.disabled = true;
    if (payBtn) payBtn.disabled = true;

    log('Init started.');
    const ok = await waitForPi();
    if (!ok) {
      setStatus('Pi SDK not found ❌');
      log('Pi SDK not found (window.Pi missing).');
      return;
    }

    if (!state.inited) {
      try {
        window.Pi.init({ version: "2.0", sandbox: true });
        state.inited = true;
        log('Pi.init({version:"2.0", sandbox:true}) called.');
      } catch (e) {
        setStatus('Pi.init error ❌');
        log('Pi.init error: ' + (e?.message || JSON.stringify(e)));
        return;
      }
    } else {
      log('Pi.init skipped (already inited).');
    }

    setStatus('Pi SDK initializing…');
    await new Promise((r) => setTimeout(r, 1200));
    state.ready = true;

    setStatus('Pi SDK ready ✅');
    if (signInBtn) signInBtn.disabled = false;
    log('Pi SDK marked ready (warm-up complete).');
  }

  // Incomplete payments callback (recommended by docs)
  function onIncompletePaymentFound(payment) {
    log('Incomplete payment found: ' + JSON.stringify(payment));
    // You may want to call your backend to reconcile/complete if needed.
  }

  // Sign-in requests BOTH username + payments scope so user can pay later.
  function signIn() {
    if (!window.Pi) { setStatus('Pi SDK not loaded'); log('Sign-in clicked but window.Pi missing.'); return; }
    if (!state.inited || !state.ready) { setStatus('Please wait 1–2 seconds then tap Sign in again…'); log('Sign-in blocked: SDK not ready yet.'); return; }

    setStatus('Signing in…');
    log('Calling Pi.authenticate([username, payments])…');

    window.Pi.authenticate(['username', 'payments'], onIncompletePaymentFound)
      .then((auth) => {
        state.auth = auth;
        const uname = auth?.user?.username || 'unknown';
        if (userLine) userLine.textContent = 'Signed in as: ' + uname;
        setStatus('Signed in ✅');
        // Enable pay only if backend base URL is set
        const backend = getBackendBaseUrl();
        if (payBtn) payBtn.disabled = !backend;
        log('Signed in success: ' + uname);
        if (!backend) log('Set Backend URL to enable payments.');
      })
      .catch((e) => {
        setStatus('Sign-in failed/cancelled');
        log('Authenticate error: ' + (e?.message || JSON.stringify(e)));
        console.error(e);
      });
  }

  async function postJson(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) {
      const msg = json?.error || text || ('HTTP ' + res.status);
      throw new Error(msg);
    }
    return json;
  }

  // Payment flow: createPayment -> server approval -> user signs -> server completion
  function pay() {
    if (!window.Pi) { setStatus('Pi SDK not loaded'); log('Pay clicked but window.Pi missing.'); return; }
    if (!state.auth) { setStatus('Please sign in first'); log('Pay blocked: not signed in.'); return; }

    const backendBase = getBackendBaseUrl();
    if (!backendBase) {
      setStatus('Set Backend URL first');
      log('Pay blocked: Backend URL empty.');
      if (payBtn) payBtn.disabled = true;
      return;
    }

    const paymentData = {
      amount: 1,
      memo: 'Ultra Video Maker — Test Payment',
      metadata: { product: 'ultra-video-maker', plan: 'test', ts: Date.now() }
    };

    const paymentCallbacks = {
      onReadyForServerApproval: async function (paymentId) {
        log('onReadyForServerApproval: ' + paymentId);
        try {
          // IMPORTANT: Approval must be server-side with your Server API Key (do NOT expose key in frontend).
          await postJson(backendBase + '/api/pi/approve', { paymentId });
          log('✅ Backend approved payment: ' + paymentId);
        } catch (e) {
          log('❌ Backend approve failed: ' + (e?.message || e));
          setStatus('Approve failed ❌');
        }
      },
      onReadyForServerCompletion: async function (paymentId, txid) {
        log('onReadyForServerCompletion: ' + paymentId + ' txid=' + txid);
        try {
          // Complete server-side; you can also deliver the item here.
          await postJson(backendBase + '/api/pi/complete', { paymentId, txid });
          log('✅ Backend completed payment: ' + paymentId);
          setStatus('Payment complete ✅');
        } catch (e) {
          log('❌ Backend complete failed: ' + (e?.message || e));
          setStatus('Complete failed ❌');
        }
      },
      onCancel: function (paymentId) {
        log('Payment cancelled: ' + paymentId);
        setStatus('Payment cancelled');
      },
      onError: function (error, payment) {
        log('Payment error: ' + (error?.message || JSON.stringify(error)));
        if (payment) log('Payment object: ' + JSON.stringify(payment));
        setStatus('Payment error ❌');
      }
    };

    setStatus('Opening payment…');
    log('Calling Pi.createPayment(amount=1)…');

    window.Pi.createPayment(paymentData, paymentCallbacks)
      .then(function (payment) {
        log('createPayment returned: ' + JSON.stringify(payment));
      })
      .catch(function (error) {
        log('createPayment error: ' + (error?.message || JSON.stringify(error)));
        setStatus('Payment failed ❌');
      });
  }

  function reload() { log('Manual reload requested.'); init(); }

  // Expose direct click handlers for inline onclick in index.html
  window.__piReloadClick = reload;
  window.__piSignInClick = signIn;
  window.__piPayClick = pay;

  // If backend URL gets set after sign-in, enable pay
  if (backendInput) {
    backendInput.addEventListener('input', () => {
      const has = !!getBackendBaseUrl();
      if (payBtn && state.auth) payBtn.disabled = !has;
    });
  }

  if (!window.__PI_INIT_STARTED_V6__) {
    window.__PI_INIT_STARTED_V6__ = true;
    init();
  } else {
    renderEnv();
    if (state.ready) setStatus('Pi SDK ready ✅');
  }
})();

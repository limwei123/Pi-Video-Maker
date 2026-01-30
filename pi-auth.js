// pi-auth.js — robust Pi SDK init + auth (prevents calling authenticate before init)
(function () {
  const envEl = document.getElementById('env');
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const reloadBtn = document.getElementById('reloadBtn');
  const signInBtn = document.getElementById('signinBtn');
  const payBtn = document.getElementById('payBtn');
  const userLine = document.getElementById('userLine');

  function ts() {
    const d = new Date();
    return d.toISOString().slice(11, 19);
  }
  function log(msg) {
    if (!logEl) return;
    logEl.textContent += `[${ts()}] ${msg}\n`;
  }
  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  function renderEnv() {
    if (!envEl) return;
    envEl.textContent =
      `hostname: ${location.hostname}\n` +
      `href: ${location.href}\n` +
      `userAgent: ${navigator.userAgent}\n` +
      `window.Pi: ${window.Pi ? 'YES' : 'NO'}`;
  }

  // Single init guard across reloads
  if (typeof window.__PI_INIT_STATE__ === 'undefined') {
    window.__PI_INIT_STATE__ = { inited: false, ready: false, initAt: 0 };
  }
  const state = window.__PI_INIT_STATE__;

  function disableAll() {
    signInBtn.disabled = true;
    payBtn.disabled = true;
  }
  function enableSignIn() {
    signInBtn.disabled = false;
  }

  async function waitForPiObject(timeoutMs = 8000) {
    const start = Date.now();
    while (!window.Pi) {
      if (Date.now() - start > timeoutMs) return false;
      await new Promise(r => setTimeout(r, 50));
    }
    return true;
  }

  async function initPi() {
    renderEnv();
    disableAll();

    const ok = await waitForPiObject();
    if (!ok) {
      setStatus('Pi SDK not found ❌');
      log('Pi SDK not found (window.Pi missing).');
      return;
    }

    // Call init only once
    if (!state.inited) {
      try {
        // In sandbox testing, set sandbox:true. (Works in sandbox & won't break normal web; auth just won't complete outside Pi Browser.)
        window.Pi.init({ sandbox: true });
        state.inited = true;
        state.initAt = Date.now();
        log('Pi.init({sandbox:true}) called.');
      } catch (e) {
        setStatus('Pi.init error ❌');
        log('Pi.init error: ' + (e?.message || JSON.stringify(e)));
        return;
      }
    } else {
      log('Pi.init skipped (already inited).');
    }

    // IMPORTANT: Pi SDK sometimes throws “not initialized” if authenticate is called immediately after init.
    // Give it a short warm-up window.
    state.ready = false;
    setStatus('Pi SDK initializing…');
    await new Promise(r => setTimeout(r, 600));
    state.ready = true;

    setStatus('Pi SDK ready ✅');
    enableSignIn();
    log('Pi SDK marked ready (warm-up complete).');
  }

  async function signIn() {
    // Must be called directly from button click (no await before calling authenticate)
    if (!window.Pi) { log('Sign-in clicked but window.Pi missing.'); return; }
    if (!state.inited) { log('Sign-in clicked but init not done yet.'); await initPi(); }
    if (!state.ready) { log('Sign-in blocked: SDK still warming up. Try again in 1s.'); setStatus('Please wait 1s then tap Sign in again…'); return; }

    try {
      setStatus('Signing in…');
      log('Calling Pi.authenticate([username])…');

      // Use username scope first (simplest). Add payments later after sign-in works.
      const auth = window.Pi.authenticate(['username'], () => {});
      const user = await auth;

      const uname = user?.user?.username || user?.username || 'unknown';
      userLine.textContent = 'Signed in as: ' + uname;
      setStatus('Signed in ✅');
      payBtn.disabled = false;
      log('Signed in success: ' + uname);
    } catch (e) {
      setStatus('Sign-in failed/cancelled');
      log('Authenticate error: ' + (e?.message || JSON.stringify(e)));
    }
  }

  async function pay() {
    if (!window.Pi) return;
    if (!state.ready) { setStatus('Please sign in first'); return; }
    try {
      setStatus('Creating payment…');
      log('Calling Pi.createPayment({amount:1})…');
      const payment = await window.Pi.createPayment({
        amount: 1,
        memo: 'Test payment (1 Pi)',
        metadata: { purpose: 'test' },
      }, {
        onReadyForServerApproval: (id) => log('Payment ready for server approval: ' + id),
        onReadyForServerCompletion: (id) => log('Payment ready for completion: ' + id),
        onCancel: (p) => log('Payment cancelled: ' + JSON.stringify(p||{})),
        onError: (err) => log('Payment error: ' + (err?.message || JSON.stringify(err))),
      });
      log('Payment result: ' + JSON.stringify(payment || {}));
      setStatus('Payment flow finished');
    } catch (e) {
      log('createPayment error: ' + (e?.message || JSON.stringify(e)));
      setStatus('Payment error');
    }
  }

  reloadBtn.addEventListener('click', async () => {
    log('Manual reload requested.');
    // Reset only the "ready" state; keep inited flag to avoid double-init issues
    state.ready = false;
    await initPi();
  });

  signInBtn.addEventListener('click', () => { signIn(); });
  payBtn.addEventListener('click', () => { pay(); });

  window.addEventListener('load', async () => {
    log('Window load event fired.');
    await initPi();
  });

  // Also kick off init immediately (in case load already fired)
  initPi();
})();

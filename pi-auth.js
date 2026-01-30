// pi-auth.js — v5
// Key fix: do NOT overwrite injected Pi bridge in Sandbox; index.html now conditionally loads SDK.
// This file only waits for window.Pi, init once, then authenticate directly on click.
(function () {
  const envEl = document.getElementById('env');
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const signInBtn = document.getElementById('signinBtn');
  const payBtn = document.getElementById('payBtn');
  const userLine = document.getElementById('userLine');

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

  if (!window.__PI_STATE__) window.__PI_STATE__ = { inited: false, ready: false };
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

    // Init only once.
    if (!state.inited) {
      try {
        // In sandbox, we must set sandbox:true. version:"2.0" is recommended.
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

    // Warm-up: allow bridge to settle
    setStatus('Pi SDK initializing…');
    await new Promise((r) => setTimeout(r, 1200)); // longer to be safe on iOS
    state.ready = true;

    setStatus('Pi SDK ready ✅');
    if (signInBtn) signInBtn.disabled = false;
    log('Pi SDK marked ready (warm-up complete).');
  }

  // Direct-click-safe authenticate. No await before calling authenticate.
  function signIn() {
    if (!window.Pi) {
      setStatus('Pi SDK not loaded');
      log('Sign-in clicked but window.Pi missing.');
      return;
    }
    if (!state.inited || !state.ready) {
      setStatus('Please wait 1–2 seconds then tap Sign in again…');
      log('Sign-in blocked: SDK not ready yet.');
      return;
    }

    setStatus('Signing in…');
    log('Calling Pi.authenticate([username])…');

    window.Pi.authenticate(['username'], () => {})
      .then((auth) => {
        const uname = auth?.user?.username || auth?.username || 'unknown';
        if (userLine) userLine.textContent = 'Signed in as: ' + uname;
        setStatus('Signed in ✅');
        if (payBtn) payBtn.disabled = false;
        log('Signed in success: ' + uname);
      })
      .catch((e) => {
        setStatus('Sign-in failed/cancelled');
        log('Authenticate error: ' + (e?.message || JSON.stringify(e)));
        console.error(e);
      });
  }

  function reload() {
    // Re-run init (won't overwrite injected bridge)
    log('Manual reload requested.');
    init();
  }

  function pay() {
    setStatus('Payments disabled in this minimal auth test.');
    log('Pay clicked (disabled).');
  }

  // Expose direct click handlers for inline onclick in index.html
  window.__piReloadClick = reload;
  window.__piSignInClick = signIn;
  window.__piPayClick = pay;

  // Start init
  if (!window.__PI_INIT_STARTED_V5__) {
    window.__PI_INIT_STARTED_V5__ = true;
    init();
  } else {
    renderEnv();
    if (state.ready) setStatus('Pi SDK ready ✅');
  }
})();

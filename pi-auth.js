// pi-auth.js — minimal, sandbox-safe Pi SDK init + direct auth
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

  // Single init guard across reloads/navigation
  if (!window.__PI_INIT_STATE__) {
    window.__PI_INIT_STATE__ = { inited: false, ready: false };
  }
  const state = window.__PI_INIT_STATE__;

  function disableUI() {
    if (signInBtn) signInBtn.disabled = true;
    if (payBtn) payBtn.disabled = true;
  }
  function enableSignIn() {
    if (signInBtn) signInBtn.disabled = false;
  }

  function waitForPiObject(timeoutMs = 8000) {
    const start = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (window.Pi) return resolve(true);
        if (Date.now() - start > timeoutMs) return resolve(false);
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  async function initOnce() {
    renderEnv();
    disableUI();

    const ok = await waitForPiObject();
    if (!ok) {
      setStatus('Pi SDK not found ❌');
      log('Pi SDK not found (window.Pi missing).');
      return;
    }

    // Init only once
    if (!state.inited) {
      try {
        window.Pi.init({ version: "2.0", sandbox: true });
        state.inited = true;
        log('Pi.init({sandbox:true}) called.');
      } catch (e) {
        setStatus('Pi.init error ❌');
        log('Pi.init error: ' + (e?.message || JSON.stringify(e)));
        return;
      }
    } else {
      log('Pi.init skipped (already inited).');
    }

    // Warm-up: Pi SDK can throw "not initialized" if auth is called too soon
    state.ready = false;
    setStatus('Pi SDK initializing…');
    await new Promise((r) => setTimeout(r, 800));
    state.ready = true;

    setStatus('Pi SDK ready ✅');
    enableSignIn();
    log('Pi SDK marked ready (warm-up complete).');
  }

  // IMPORTANT: must be a DIRECT click handler; no await BEFORE calling authenticate
  function signInDirect() {
    if (!window.Pi) {
      setStatus('Pi SDK not loaded');
      log('Sign-in clicked but window.Pi missing.');
      return;
    }
    if (!state.inited || !state.ready) {
      setStatus('Please wait 1s then tap Sign in again…');
      log('Sign-in blocked: SDK not ready yet.');
      return;
    }

    setStatus('Signing in…');
    log('Calling Pi.authenticate([username])…');

    // No async/await here. Call authenticate immediately inside click.
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

  function pay() {
    setStatus('Payments disabled in this minimal auth test.');
    log('Pay clicked (disabled in minimal auth test).');
  }

  // Buttons
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      log('Manual reload requested → re-initializing.');
      initOnce();
    });
  }
  if (signInBtn) signInBtn.addEventListener('click', signInDirect);
  if (payBtn) payBtn.addEventListener('click', pay);

  // Init ONCE (avoid multiple init calls causing noisy logs)
  if (!window.__PI_INIT_STARTED__) {
    window.__PI_INIT_STARTED__ = true;
    log('Init started.');
    initOnce();
  } else {
    renderEnv();
    if (state.ready) setStatus('Pi SDK ready ✅');
  }
})();

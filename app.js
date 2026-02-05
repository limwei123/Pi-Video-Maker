const PI_AUTH_SCRIPT_ID = "pi-auth-script";
const e = React.createElement;

function getPathPrefix() {
  // Pi Sandbox uses /app/<slug>/... as the visible path
  const m = window.location.pathname.match(/^\/app\/[^/]+/);
  return m ? m[0] : "";
}

function assetUrl(filename) {
  const prefix = getPathPrefix();
  // Ensure assets load correctly both at "/" and under "/app/<slug>"
  return prefix ? `${prefix}/${filename}` : `/${filename}`;
}

function loadPiAuthScript() {
  if (document.getElementById(PI_AUTH_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = PI_AUTH_SCRIPT_ID;
  script.src = assetUrl("pi-auth.js");
  script.async = true;
  document.body.appendChild(script);
}

function PaymentPage() {
  loadPiAuthScript();

  return e(
    "main",
    null,
    e("h1", null, "Ultra Video Maker"),
    e("div", { id: "status" }, "Loading…"),
    e(
      "button",
      {
        id: "signinBtn",
        onClick: () => window.__piSignInClick && window.__piSignInClick(),
        disabled: true,
      },
      "Sign in with Pi"
    ),
    e("br"),
    e("br"),
    e(
      "button",
      {
        id: "payBtn",
        onClick: () => window.__piPayClick && window.__piPayClick(),
        disabled: true,
      },
      "Pay with Pi (1 Pi)"
    ),
    e("p", { id: "userLine" }, "Not signed in"),
    e("pre", { id: "log" })
  );
}

function CreateVideoPage() {
  return e(
    "main",
    null,
    e("h1", null, "Create Your Video"),
    e("p", null, "Your video creation workspace will appear here soon.")
  );
}

function NotFoundPage() {
  return e(
    "main",
    null,
    e("h1", null, "Page not found"),
    e("p", null, "Return to / to start a payment.")
  );
}

function App() {
  const path = window.location.pathname;

  if (path === "/") {
    return e(PaymentPage);
  }

  if (path === "/create-video") {
    return e(CreateVideoPage);
  }

  return e(NotFoundPage);
}

const mountEl = document.getElementById("root");
const root = ReactDOM.createRoot ? ReactDOM.createRoot(mountEl) : null;
if (root) { root.render(e(App)); } else { ReactDOM.render(e(App), mountEl); }

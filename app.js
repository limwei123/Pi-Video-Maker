const PI_AUTH_SCRIPT_ID = "pi-auth-script";

// In Pi Sandbox, the app is served under /app/<slug>/... so we must handle a path prefix.
function getPathPrefix() {
  const m = window.location.pathname.match(/^\/app\/[^\/]+/);
  return m ? m[0] : "";
}

const e = React.createElement;

function loadPiAuthScript() {
  if (document.getElementById(PI_AUTH_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = PI_AUTH_SCRIPT_ID;
  script.src = `${getPathPrefix()}/pi-auth.js`;
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
  const rawPath = window.location.pathname;
  const prefix = getPathPrefix();
  const path = rawPath.startsWith(prefix) ? (rawPath.slice(prefix.length) || "/") : rawPath;

  if (path === "/") {
    return e(PaymentPage);
  }

  if (path === "/create-video") {
    return e(CreateVideoPage);
  }

  return e(NotFoundPage);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(e(App));
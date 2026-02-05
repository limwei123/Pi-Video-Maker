const PI_AUTH_SCRIPT_ID = "pi-auth-script";
const e = React.createElement;

// Detect Pi Sandbox path prefix like: /app/<slug>
function getPiSandboxPrefix(pathname) {
  const m = pathname.match(/^\/app\/[^/]+/);
  return m ? m[0] : "";
}

function getNormalizedPath() {
  const full = window.location.pathname || "/";
  const prefix = getPiSandboxPrefix(full);
  if (!prefix) return { prefix: "", path: full };
  const rest = full.slice(prefix.length) || "/";
  return { prefix, path: rest };
}

function loadPiAuthScript() {
  if (document.getElementById(PI_AUTH_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = PI_AUTH_SCRIPT_ID;

  // Absolute path so it loads correctly even when current URL is /app/<slug>
  script.src = "/pi-auth.js";
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
        style: "margin-top:12px;padding:10px 14px;border-radius:10px;border:0;cursor:pointer"
      },
      "Sign in with Pi"
    ),
    e("div", { style: "height:10px" }),
    e(
      "button",
      {
        id: "payBtn",
        onClick: () => window.__piPayClick && window.__piPayClick(),
        disabled: true,
        style: "padding:10px 14px;border-radius:10px;border:0;cursor:pointer"
      },
      "Pay with Pi (1 Pi)"
    ),
    e("p", { id: "userLine", style: "opacity:0.9;margin-top:12px" }, "Not signed in"),
    e("pre", { id: "log", style: "white-space:pre-wrap;background:#12121a;padding:12px;border-radius:12px;margin-top:12px" })
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
  const { prefix } = getNormalizedPath();
  const home = prefix ? `${prefix}/` : "/";
  return e(
    "main",
    null,
    e("h1", null, "Page not found"),
    e("p", null, "Return to the home page to start payment:"),
    e("p", null, home)
  );
}

function App() {
  const { path } = getNormalizedPath();

  if (path === "/") return e(PaymentPage);
  if (path === "/create-video") return e(CreateVideoPage);

  // If Pi Sandbox opens some extra route, you can force to home:
  // window.location.replace(getNormalizedPath().prefix + "/");
  return e(NotFoundPage);
}

const mount = document.getElementById("root");
if (ReactDOM.createRoot) {
  ReactDOM.createRoot(mount).render(e(App));
} else {
  ReactDOM.render(e(App), mount);
}

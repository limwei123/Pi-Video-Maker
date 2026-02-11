const PI_AUTH_SCRIPT_ID = "pi-auth-script";
const e = React.createElement;

function loadPiAuthScript() {
  if (document.getElementById(PI_AUTH_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = PI_AUTH_SCRIPT_ID;
  script.src = "./pi-auth.js";
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

  // Support running inside Pi Browser wrapper paths like /app/<app-name>/...
  const normalized = (path.endsWith("/") && path.length > 1) ? path.slice(0, -1) : path;

  if (normalized === "/" || normalized === "") {
    return e(PaymentPage);
  }

  // Match both /create-video and /app/ultra-video-maker/create-video etc.
  if (normalized.endsWith("/create-video")) {
    return e(CreateVideoPage);
  }

  return e(NotFoundPage);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(e(App));

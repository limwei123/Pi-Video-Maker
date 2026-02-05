/**
 * Ultra Video Maker - minimal SPA router that works in:
 * 1) Normal hosting (https://pi-video-maker.vercel.app/)
 * 2) Pi Sandbox hosting (https://sandbox.minepi.com/app/<app-slug>/...)
 *
 * Key idea:
 * - Detect sandbox prefix "/app/<slug>" and preserve it for navigation.
 * - Normalize the "internal route" so "/app/<slug>/create-video" becomes "/create-video".
 */

const { useEffect, useState } = React;

const APP_ASSET_ORIGIN = "https://pi-video-maker.vercel.app";
const PI_AUTH_SCRIPT_ID = "pi-auth-script";

function getSandboxPrefix() {
  const p = window.location.pathname || "/";
  // sandbox pattern: /app/<slug>/...
  if (!p.startsWith("/app/")) return "";
  const parts = p.split("/"); // ["", "app", "<slug>", ...]
  const slug = parts[2] || "";
  if (!slug) return "";
  return `/app/${slug}`;
}

function getInternalPath() {
  const prefix = getSandboxPrefix();
  const p = window.location.pathname || "/";
  if (prefix && p.startsWith(prefix)) {
    const rest = p.slice(prefix.length) || "/";
    return rest.startsWith("/") ? rest : `/${rest}`;
  }
  return p;
}

function navigateInternal(toInternalPath) {
  const prefix = getSandboxPrefix();
  const target = `${prefix}${toInternalPath.startsWith("/") ? toInternalPath : `/${toInternalPath}`}`;
  window.location.assign(target);
}

function loadPiAuthScript() {
  if (document.getElementById(PI_AUTH_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = PI_AUTH_SCRIPT_ID;

  // IMPORTANT:
  // In Pi Sandbox, the page origin can be sandbox.minepi.com (proxy), so relative "./pi-auth.js"
  // may 404. Use the canonical hosted asset URL instead.
  script.src = `${APP_ASSET_ORIGIN}/pi-auth.js`;
  script.async = true;

  document.body.appendChild(script);
}

function PaymentPage() {
  useEffect(() => {
    loadPiAuthScript();
  }, []);

  return React.createElement(
    "main",
    null,
    React.createElement("h1", null, "Ultra Video Maker"),
    React.createElement("div", { id: "status" }, "Loading..."),
    React.createElement(
      "button",
      {
        id: "signinBtn",
        onClick: () => window.__piSignInClick && window.__piSignInClick(),
        disabled: true,
      },
      "Sign in with Pi"
    ),
    React.createElement("br", null),
    React.createElement("br", null),
    React.createElement(
      "button",
      {
        id: "payBtn",
        onClick: () => window.__piPayClick && window.__piPayClick(),
        disabled: true,
      },
      "Pay with Pi (1 Pi)"
    ),
    React.createElement("br", null),
    React.createElement("br", null),
    React.createElement("div", { id: "userLine" }, "Not signed in"),
    React.createElement("pre", { id: "log" }, "Pi SDK loading...")
  );
}

function CreateVideoPage() {
  return React.createElement(
    "main",
    null,
    React.createElement("h1", null, "Create Video"),
    React.createElement(
      "p",
      null,
      "✅ Payment verified. Now redirecting you to the video creation flow (replace this placeholder with your real UI)."
    ),
    React.createElement(
      "button",
      { onClick: () => navigateInternal("/") },
      "Back to Payment"
    )
  );
}

function NotFound() {
  return React.createElement(
    "main",
    null,
    React.createElement("h1", null, "Page not found"),
    React.createElement("p", null, "Return to / to start a payment."),
    React.createElement(
      "button",
      { onClick: () => navigateInternal("/") },
      "Go to Payment"
    )
  );
}

function App() {
  const internalPath = getInternalPath();

  if (internalPath === "/" || internalPath === "") return React.createElement(PaymentPage);
  if (internalPath === "/create-video") return React.createElement(CreateVideoPage);

  return React.createElement(NotFound);
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));

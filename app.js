// Ultra Video Maker - tiny SPA (no build step)
// Routes: "/" (payment) and "/create-video" (post-payment)

const e = React.createElement;
const ROOT_ID = "root";
const PI_AUTH_SCRIPT_ID = "pi-auth-script";

function loadPiAuthScript() {
  if (document.getElementById(PI_AUTH_SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = PI_AUTH_SCRIPT_ID;
  script.src = "./pi-auth.js";
  script.async = true;
  document.body.appendChild(script);
}

function navigate(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  renderApp();
}

function PaymentPage() {
  // Ensure Pi auth logic is loaded (attaches click handlers + enables buttons)
  loadPiAuthScript();

  return e(
    "main",
    { style: { maxWidth: "560px", margin: "0 auto", paddingTop: "24px" } },
    e("h1", { style: { fontSize: "40px", margin: "0 0 8px 0" } }, "Ultra Video Maker"),
    e("div", { id: "status", style: { marginBottom: "10px", opacity: 0.9 } }, "Loading…"),
    e(
      "button",
      {
        id: "signinBtn",
        disabled: true,
        style: btnStyle("#ff9f1a", true),
        onClick: () => window.__piSignInClick && window.__piSignInClick(),
      },
      "Sign in with Pi"
    ),
    e("div", { style: { height: "14px" } }),
    e(
      "button",
      {
        id: "payBtn",
        disabled: true,
        style: btnStyle("#2ecc71", true),
        onClick: () => window.__piPayClick && window.__piPayClick(),
      },
      "Pay with Pi (1π)"
    ),
    e("p", { id: "userLine", style: { marginTop: "18px", fontSize: "18px" } }, "Not signed in"),
    e(
      "pre",
      {
        id: "log",
        style: {
          marginTop: "16px",
          padding: "12px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "10px",
          whiteSpace: "pre-wrap",
          fontSize: "13px",
          lineHeight: 1.35,
          minHeight: "110px",
        },
      },
      ""
    )
  );
}

function CreateVideoPage() {
  const paid = sessionStorage.getItem("pi_paid") === "1";

  return e(
    "main",
    { style: { maxWidth: "720px", margin: "0 auto", paddingTop: "24px" } },
    e("h1", { style: { fontSize: "40px", margin: "0 0 8px 0" } }, "Ultra Video Maker — Create Video"),
    paid
      ? e(
          "p",
          { style: { fontSize: "18px", opacity: 0.95 } },
          "✅ Payment confirmed. This is the placeholder for your video creating app."
        )
      : e(
          "p",
          { style: { fontSize: "18px", opacity: 0.95 } },
          "⚠️ You opened /create-video directly. Please complete payment first."
        ),
    e("p", { style: { opacity: 0.85 } }, "Next: replace this page with your real video creator UI."),
    e(
      "button",
      {
        style: btnStyle("#d9d9d9", false),
        onClick: () => navigate("/"),
      },
      "Back to Payment"
    )
  );
}

function NotFoundPage() {
  return e(
    "main",
    { style: { maxWidth: "720px", margin: "0 auto", paddingTop: "24px" } },
    e("h1", null, "Page not found"),
    e("p", null, "Return to / to start a payment."),
    e(
      "button",
      { style: btnStyle("#d9d9d9", false), onClick: () => navigate("/") },
      "Go to Payment"
    )
  );
}

function btnStyle(bg, lightText) {
  return {
    width: "100%",
    maxWidth: "380px",
    display: "block",
    border: "none",
    borderRadius: "14px",
    padding: "18px 16px",
    fontSize: "20px",
    cursor: "pointer",
    background: bg,
    color: lightText ? "#111" : "#111",
    fontWeight: 700,
    boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
  };
}

function getRoute() {
  const p = window.location.pathname || "/";
  if (p === "/" || p === "") return "payment";
  if (p === "/create-video") return "create";
  return "404";
}

function App() {
  const route = getRoute();
  if (route === "payment") return PaymentPage();
  if (route === "create") return CreateVideoPage();
  return NotFoundPage();
}

function renderApp() {
  const container = document.getElementById(ROOT_ID);
  if (!container) return;
  ReactDOM.render(e(App), container);
}

window.addEventListener("popstate", renderApp);
renderApp();

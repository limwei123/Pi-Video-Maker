import React, { useEffect } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "https://esm.sh/react-router-dom@6.23.1";

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
  useEffect(() => {
    loadPiAuthScript();
  }, []);

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
    e("p", null, "Your video creation workspace will appear here soon."),
    e(
      "p",
      null,
      e(Link, { to: "/" }, "Back to payments")
    )
  );
}

function NotFoundPage() {
  return e(
    "main",
    null,
    e("h1", null, "Page not found"),
    e(
      "p",
      null,
      e(Link, { to: "/" }, "Return home")
    )
  );
}

function App() {
  return e(
    BrowserRouter,
    null,
    e(
      Routes,
      null,
      e(Route, { path: "/", element: e(PaymentPage) }),
      e(Route, { path: "/create-video", element: e(CreateVideoPage) }),
      e(Route, { path: "*", element: e(NotFoundPage) })
    )
  );
}

const root = createRoot(document.getElementById("root"));
root.render(e(App));

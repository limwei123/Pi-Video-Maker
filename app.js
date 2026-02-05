import React, { useEffect } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "https://esm.sh/react-router-dom@6.23.1";

const PI_AUTH_SCRIPT_ID = "pi-auth-script";

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

  return (
    <main>
      <h1>Ultra Video Maker</h1>

      <div id="status">Loading…</div>

      <button
        id="signinBtn"
        onClick={() => window.__piSignInClick && window.__piSignInClick()}
        disabled
      >
        Sign in with Pi
      </button>

      <br />
      <br />

      <button
        id="payBtn"
        onClick={() => window.__piPayClick && window.__piPayClick()}
        disabled
      >
        Pay with Pi (1 Pi)
      </button>

      <p id="userLine">Not signed in</p>

      <pre id="log"></pre>
    </main>
  );
}

function CreateVideoPage() {
  return (
    <main>
      <h1>Create Your Video</h1>
      <p>Your video creation workspace will appear here soon.</p>
      <p>
        <Link to="/">Back to payments</Link>
      </p>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Return home</Link>
      </p>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PaymentPage />} />
        <Route path="/create-video" element={<CreateVideoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = createRoot(document.getElementById("root"));
root.render(<App />);

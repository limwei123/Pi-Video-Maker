(function () {
  const { createElement: e, useEffect, useState } = React;

  function CreateVideoPage() {
    return e(
      "main",
      { style: { maxWidth: 520, margin: "0 auto", padding: 16 } },
      e("h1", null, "Ultra Video Maker — Create Video"),
      e("p", null, "✅ Payment confirmed. This is the placeholder for your video creating app."),
      e("p", null, "Next: replace this page with your real video creator UI."),
      e(
        "button",
        {
          style: {
            padding: "12px 16px",
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
          },
          onClick: () => (window.location.href = "/"),
        },
        "Back to Payment"
      )
    );
  }

  function PaymentPage() {
    // The Pi auth script will find these IDs and wire up the buttons.
    return e(
      "main",
      { style: { maxWidth: 520, margin: "0 auto", padding: 16 } },
      e("h1", null, "Ultra Video Maker"),
      e("div", { id: "status", style: { marginBottom: 10 } }, "Loading…"),
      e(
        "button",
        {
          id: "signInBtn",
          style: { padding: "12px 16px", borderRadius: 10, border: "none", cursor: "pointer" },
          disabled: true,
        },
        "Sign in with Pi"
      ),
      e("div", { style: { height: 10 } }),
      e(
        "button",
        {
          id: "payBtn",
          style: { padding: "12px 16px", borderRadius: 10, border: "none", cursor: "pointer" },
          disabled: true,
        },
        "Pay with Pi (1π)"
      ),
      e("div", { style: { height: 14 } }),
      e("div", { id: "userLine", style: { opacity: 0.9 } }, "Not signed in"),
      e("pre", { id: "log", style: { marginTop: 14, whiteSpace: "pre-wrap", opacity: 0.9 } })
    );
  }

  function App() {
    const [path, setPath] = useState(window.location.pathname || "/");

    useEffect(() => {
      const onPop = () => setPath(window.location.pathname || "/");
      window.addEventListener("popstate", onPop);
      return () => window.removeEventListener("popstate", onPop);
    }, []);

    // Simple route: /create-video
    if (path === "/create-video") return e(CreateVideoPage);
    return e(PaymentPage);
  }

  const root = document.getElementById("root");
  ReactDOM.createRoot(root).render(e(App));
})();

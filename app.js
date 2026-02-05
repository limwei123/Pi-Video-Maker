(function () {
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else node.setAttribute(k, v);
      }
    }
    for (const child of children) {
      if (child == null) continue;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  function renderPayment(root) {
    const wrap = el("div", { class: "wrap" });
    wrap.appendChild(el("h1", { class: "title", text: "Ultra Video\nMaker" }));

    wrap.appendChild(el("p", { class: "subtitle", id: "sdkStatus", text: "Loading Pi SDK..." }));

    wrap.appendChild(el("button", { class: "btn orange", id: "signInBtn", disabled: "true", text: "Sign in with Pi" }));
    wrap.appendChild(el("button", { class: "btn green", id: "payBtn", disabled: "true", text: "Pay with Pi (1π)" }));

    wrap.appendChild(el("div", { class: "statusLine", id: "userLine", text: "Not signed in" }));
    wrap.appendChild(el("div", { class: "logbox", id: "log", text: "" }));

    root.appendChild(wrap);
  }

  function renderCreateVideo(root) {
    const wrap = el("div", { class: "wrap" });
    wrap.appendChild(el("h1", { class: "h2", html: "Ultra Video Maker<br/>— Create Video" }));

    const row = el("div", { class: "okRow" },
      el("div", { class: "okIcon", text: "✅" }),
      el("div", { html: "<b>Payment confirmed.</b> This is the placeholder for your video creating app.<br/><br/>Next: replace this page with your real video creator UI." })
    );
    wrap.appendChild(row);

    const back = el("button", { class: "smallBtn", id: "backBtn", text: "Back to Payment" });
    back.onclick = () => { window.location.assign("/"); };
    wrap.appendChild(el("div", { style: "margin-top:18px" }, back));

    root.appendChild(wrap);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.getElementById("root");
    if (!root) return;

    // Clear
    root.innerHTML = "";

    if (window.location.pathname === "/create-video") renderCreateVideo(root);
    else renderPayment(root);
  });
})();
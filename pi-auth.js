
let piReady = false;

async function initPi() {
  if (piReady) return;
  try {
    Pi.init({ version: "2.0", sandbox: true });
    piReady = true;
    document.getElementById("status").innerText = "Pi SDK ready";
    document.getElementById("login").disabled = false;
  } catch (e) {
    document.getElementById("status").innerText = "Pi SDK failed to load";
    console.error(e);
  }
}

window.addEventListener("load", initPi);


/* Ultra Video Maker - ecommerce-ready (no build tools)
   Routes:
   - /            payment + unlock
   - /create-video video maker (unlocked)
*/
const e = React.createElement;

function useState(initial) { return React.useState(initial); }
function useEffect(fn, deps){ return React.useEffect(fn, deps); }
function useRef(v){ return React.useRef(v); }

const BACKGROUND_LIB = {
  beauty: { prefix: "/assets/bg/beauty/beauty_", count: 30, ext: ".webp" },
  home:   { prefix: "/assets/bg/home/home_",     count: 30, ext: ".webp" },
  gadget: { prefix: "/assets/bg/gadget/gadget_", count: 30, ext: ".webp" },
  watch:  { prefix: "/assets/bg/watch/watch_",   count: 30, ext: ".webp" },
  fmcg:   { prefix: "/assets/bg/home/home_",     count: 30, ext: ".webp" },
};

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

function isIOS(){
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
function canRecord(){
  return !!(HTMLCanvasElement.prototype.captureStream && window.MediaRecorder);
}

function logAppend(setLog, msg){
  setLog(prev => (prev ? prev + "\n" : "") + msg);
}

async function preloadImages(urls, onProgress){
  const imgs = [];
  let done = 0;
  for (const url of urls){
    const img = new Image();
    img.crossOrigin = "anonymous";
    const p = new Promise((res, rej)=>{
      img.onload = ()=>res();
      img.onerror = ()=>rej(new Error("Failed to load: "+url));
    });
    img.src = url + (url.includes("?") ? "" : "?v=" + Date.now()); // bust cache just in case
    try{
      await p;
      imgs.push(img);
    }catch(e){
      // If any image missing, just skip it; generator will fallback later.
      imgs.push(null);
    }
    done++;
    onProgress && onProgress(done, urls.length);
  }
  return imgs;
}

function pickLibrary(category){
  let cat = String(category || "").toLowerCase().trim();
  if (cat === "fmcg") cat = "fmcg";
  if (!BACKGROUND_LIB[cat]) cat = "beauty";
  return BACKGROUND_LIB[cat];
}

function pickThemeColor(category){
  const cat = String(category||"").toLowerCase().trim();
  if (cat === "watch") return "#0ea5e9";
  if (cat === "gadget") return "#22c55e";
  if (cat === "home" || cat === "fmcg") return "#f59e0b";
  return "#7c3aed"; // beauty default
}

function safeText(s, max=60){
  s = String(s || "").trim();
  if (!s) return "";
  if (s.length > max) return s.slice(0, max-1) + "…";
  return s;
}

function formatPrice(p){
  const v = String(p||"").trim();
  if (!v) return "";
  // allow user to type RM99, 99, 99.90
  const cleaned = v.replace(/[^0-9.]/g,"");
  if (!cleaned) return v;
  // keep as entered if has decimals
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return v;
  return "RM" + (cleaned.includes(".") ? cleaned : String(Math.trunc(num)));
}

function buildSlides(input){
  // Minimal ecommerce flow: 5 slides
  const slides = [];
  const product = safeText(input.productName, 38) || "Your Product";
  const promo = safeText(input.promoText, 60) || "Online Exclusive • Limited Stock";
  const price = formatPrice(input.price);
  const discount = safeText(input.discount, 16); // e.g. "20% OFF" or "RM20 OFF"

  const cta = input.platform === "shopee" ? "Tap to shop on Shopee"
            : input.platform === "tiktok" ? "Tap to shop on TikTok"
            : "Tap to shop now";

  // Slide 1: Hero / brand
  slides.push({
    title: input.template === "launch" ? "NEW ARRIVAL" : "CHECKOUT TODAY",
    product,
    subtitle: promo,
    price: price || "",
    badge: discount || "",
    cta,
    showPrice: !!price,
    showBadge: !!discount,
    style: input.template,
  });

  // Slide 2: Price focus (requested)
  slides.push({
    title: "SPECIAL PRICE",
    product,
    subtitle: promo,
    price: price || "RM99",
    badge: discount || "",
    cta,
    showPrice: true,
    showBadge: !!discount,
    style: "price",
  });

  // Slide 3: Benefit bullet
  slides.push({
    title: "WHY YOU'LL LOVE IT",
    product,
    subtitle: input.bullets || "• Ready stock\n• Fast shipping\n• Best seller pick",
    price: "",
    badge: discount || "",
    cta,
    showPrice: false,
    showBadge: !!discount,
    style: "bullets",
  });

  // Slide 4: CTA heavy
  slides.push({
    title: "LIMITED UNITS",
    product,
    subtitle: "Grab yours before sold out",
    price: price || "",
    badge: discount || "",
    cta: input.platform === "shopee" ? "Add to cart now"
        : input.platform === "tiktok" ? "Tap Buy Now"
        : "Shop now",
    showPrice: !!price,
    showBadge: !!discount,
    style: "cta",
  });

  // Slide 5: End card
  slides.push({
    title: input.brandName ? input.brandName.toUpperCase() : "YOUR BRAND",
    product,
    subtitle: "Follow us for more deals",
    price: "",
    badge: "",
    cta: "Save & share",
    showPrice: false,
    showBadge: false,
    style: "end",
  });

  return slides;
}

function drawRoundedRect(ctx, x,y,w,h,r){
  r = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

function drawTextBlock(ctx, text, x, y, maxWidth, lineHeight, maxLines){
  const words = String(text||"").split(/\s+/);
  let line = "";
  const lines = [];
  for (const w of words){
    const test = (line ? line + " " : "") + w;
    if (ctx.measureText(test).width <= maxWidth){
      line = test;
    }else{
      if (line) lines.push(line);
      line = w;
      if (maxLines && lines.length >= maxLines) break;
    }
  }
  if (line && (!maxLines || lines.length < maxLines)) lines.push(line);
  lines.forEach((ln, i)=> ctx.fillText(ln, x, y + i*lineHeight));
  return lines.length;
}

function canvasRenderFrame(ctx, W, H, slide, bgImg, theme, logoImg, t01){
  // t01: 0..1 within the slide for subtle motion
  ctx.clearRect(0,0,W,H);

  // Background
  if (bgImg){
    // cover
    const iw = bgImg.naturalWidth || bgImg.width;
    const ih = bgImg.naturalHeight || bgImg.height;
    const scale = Math.max(W/iw, H/ih);
    const dw = iw*scale, dh=ih*scale;
    const dx = (W - dw)/2, dy=(H - dh)/2;
    ctx.drawImage(bgImg, dx, dy, dw, dh);
    // dark overlay for readability
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0,0,W,H);
  } else {
    // fallback gradient
    const g = ctx.createLinearGradient(0,0,W,H);
    g.addColorStop(0, theme);
    g.addColorStop(1, "#111827");
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);
  }

  // Accent strip
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(0,0,W,20);

  // Title
  ctx.fillStyle = "rgba(255,255,255,.9)";
  ctx.font = "800 44px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,.55)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;

  const pad = 54;
  const y0 = 120;
  ctx.fillText(slide.title || "", pad, y0);

  // Product
  ctx.font = "800 64px system-ui, -apple-system, Segoe UI, Roboto";
  const py = y0 + 70 + Math.sin(t01*2*Math.PI)*4;
  drawTextBlock(ctx, slide.product || "", pad, py, W - pad*2, 72, 2);

  // Subtitle / promo text
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = "rgba(255,255,255,.82)";
  ctx.font = "500 32px system-ui, -apple-system, Segoe UI, Roboto";
  const sub = String(slide.subtitle || "");
  if (slide.style === "bullets"){
    // bullets as multi-line
    const lines = sub.split("\n").slice(0,4);
    let by = py + 160;
    for (const ln of lines){
      ctx.fillText(ln.trim(), pad, by);
      by += 42;
    }
  } else {
    drawTextBlock(ctx, sub, pad, py + 160, W - pad*2, 40, 3);
  }

  // Price bubble / slide
  if (slide.showPrice && slide.price){
    const bubbleW = 260;
    const bubbleH = 92;
    const bx = pad;
    const by = H - 220;
    ctx.fillStyle = "rgba(255,255,255,.90)";
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
    drawRoundedRect(ctx, bx, by, bubbleW, bubbleH, 28);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111827";
    ctx.font = "900 52px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(slide.price, bx + 26, by + 20);
  }

  // Discount badge
  if (slide.showBadge && slide.badge){
    const txt = slide.badge.toUpperCase();
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto";
    const tw = ctx.measureText(txt).width;
    const bw = tw + 34;
    const bh = 48;
    const bx = W - bw - pad;
    const by = H - 220;
    ctx.fillStyle = theme;
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    drawRoundedRect(ctx, bx, by, bw, bh, 16);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "white";
    ctx.textBaseline = "top";
    ctx.fillText(txt, bx + 17, by + 12);
  }

  // CTA
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.font = "600 30px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.fillText(slide.cta || "Tap to shop now", pad, H - 120);

  // Logo auto placement (top-right)
  if (logoImg){
    const lw = 120;
    const lh = 120;
    const lx = W - lw - pad;
    const ly = 40;
    ctx.globalAlpha = 0.88;
    ctx.drawImage(logoImg, lx, ly, lw, lh);
    ctx.globalAlpha = 1;
  }
}

async function recordWebMFromCanvas(canvas, seconds, fps=30){
  const stream = canvas.captureStream(fps);
  const chunks = [];
  const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  rec.ondataavailable = (ev)=>{ if (ev.data && ev.data.size) chunks.push(ev.data); };
  rec.start(200);
  await sleep(seconds*1000);
  rec.stop();
  await new Promise(r=> rec.onstop = r);
  return new Blob(chunks, { type: "video/webm" });
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function readFileAsDataURL(file){
  return new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = ()=>res(String(fr.result));
    fr.onerror = ()=>rej(fr.error);
    fr.readAsDataURL(file);
  });
}

function dataURLToImage(dataUrl){
  return new Promise((res, rej)=>{
    const img = new Image();
    img.onload = ()=>res(img);
    img.onerror = rej;
    img.src = dataUrl;
  });
}

function PaymentPage(){
  return e("div", { className:"wrap" },
    e("div", { className:"topbar" },
      e("div", { className:"brand" },
        e("div", { className:"chip" }, "Ultra Video Maker"),
        e("div", { className:"chip" }, "Pi SDK / Sign-in / Payment")
      ),
      e("a", { href:"/create-video", className:"pill" }, "Go to maker →")
    ),
    e("div", { className:"card" },
      e("h1", null, "Unlock access"),
      e("div", { className:"muted" }, "Sign in with Pi, pay once, and your access will stay unlocked."),
      e("div", { id:"status", className:"statusLine" }, e("span", { className:"dot" }), e("span", null, "Loading…")),
      e("div", { className:"btnRow" },
        e("button", { id:"signinBtn", className:"btn", disabled:true, onClick: ()=>window.__piSignInClick && window.__piSignInClick() }, "Sign in with Pi"),
        e("button", { id:"payBtn", className:"btn primary", disabled:true, onClick: ()=>window.__piPayClick && window.__piPayClick() }, "Pay with Pi (1 Pi)")
      ),
      e("p", { id:"userLine", className:"muted" }, "Not signed in"),
      e("div", { id:"paidLine", className:"pill", style:{ display:"none" } }, "Paid access: unlocked ✅"),
      e("div", { id:"hintLine", className:"help", style:{ marginTop:"10px" } }, "After payment succeeds, you will be redirected automatically to the video maker."),
      e("pre", { id:"log", className:"log" })
    )
  );
}

function CreateVideoPage(){
  const [productName, setProductName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [promoText, setPromoText] = useState("Online Exclusive • Limited Stock");
  const [price, setPrice] = useState("RM99");
  const [discount, setDiscount] = useState("");
  const [platform, setPlatform] = useState("tiktok");
  const [category, setCategory] = useState("beauty");
  const [template, setTemplate] = useState("promo");
  const [bullets, setBullets] = useState("• Ready stock\n• Fast shipping\n• Best seller pick");
  const [musicOn, setMusicOn] = useState(true); // placeholder; music synth can be added later
  const [log, setLog] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [theme, setTheme] = useState(pickThemeColor("beauty"));

  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  const [logoData, setLogoData] = useState(()=> localStorage.getItem("uvm_logo") || "");
  const [logoImg, setLogoImg] = useState(null);

  useEffect(()=>{
    setTheme(pickThemeColor(category));
    document.documentElement.style.setProperty("--accent", pickThemeColor(category));
  }, [category]);

  useEffect(()=>{
    (async ()=>{
      if (!logoData) { setLogoImg(null); return; }
      try{
        const img = await dataURLToImage(logoData);
        setLogoImg(img);
      }catch(e){ setLogoImg(null); }
    })();
  }, [logoData]);

  async function onLogoUpload(ev){
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const data = await readFileAsDataURL(f);
    localStorage.setItem("uvm_logo", data);
    setLogoData(data);
    logAppend(setLog, "Logo saved (auto placed in videos).");
  }

  function clearLogo(){
    localStorage.removeItem("uvm_logo");
    setLogoData("");
    setLogoImg(null);
    logAppend(setLog, "Logo removed.");
  }

  async function generate(){
    setIsGenerating(true);
    setProgress("Preparing…");
    setLog("");

    try{
      const input = {
        productName, brandName, promoText, price, discount, platform,
        category, template, bullets, musicOn
      };

      // Build slide plan
      const slides = buildSlides(input);
      logAppend(setLog, `Slides: ${slides.length}`);

      // Choose backgrounds (cycle)
      const lib = pickLibrary(category);
      const urls = [];
      for (let i=1;i<=slides.length;i++){
        const idx = ((i-1) % lib.count) + 1;
        const num = String(idx).padStart(2,"0");
        urls.push(`${lib.prefix}${num}${lib.ext}`);
      }

      setProgress("Loading backgrounds…");
      const bgs = await preloadImages(urls, (d,t)=> setProgress(`Loading backgrounds… ${d}/${t}`));

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const W = 720, H = 1280;
      canvas.width = W; canvas.height = H;

      // Playback render (preview)
      const slideSeconds = 2.0;
      const fps = 30;
      const totalSeconds = slides.length * slideSeconds;

      // If recording is available (desktop), record into WebM so user can download.
      const doRecord = canRecord() && !isIOS();

      let recPromise = null;
      if (doRecord){
        setProgress("Recording video (WebM)…");
        recPromise = recordWebMFromCanvas(canvas, totalSeconds, fps);
      } else {
        setProgress(isIOS()
          ? "Preview ready (iOS: export limited)."
          : "Preview ready (export may be limited in this browser)."
        );
      }

      // Render loop (also drives recording capture stream)
      const start = performance.now();
      const endAt = start + totalSeconds*1000;
      let frame = 0;
      while (performance.now() < endAt){
        const now = performance.now();
        const elapsed = (now - start)/1000;
        const slideIndex = clamp(Math.floor(elapsed / slideSeconds), 0, slides.length-1);
        const within = (elapsed - slideIndex*slideSeconds) / slideSeconds; // 0..1
        const bg = bgs[slideIndex] || null;
        canvasRenderFrame(ctx, W, H, slides[slideIndex], bg, theme, logoImg, within);

        // Progress indicator
        if (frame % 10 === 0){
          const pct = Math.round((elapsed/totalSeconds)*100);
          setProgress(`Generating… ${pct}%`);
        }

        frame++;
        await sleep(1000/fps);
      }

      // Final frame
      canvasRenderFrame(ctx, W, H, slides[slides.length-1], bgs[bgs.length-1] || null, theme, logoImg, 1);

      // If we recorded, attach to <video> and offer download
      if (recPromise){
        const blob = await recPromise;
        logAppend(setLog, `WebM ready: ${Math.round(blob.size/1024)} KB`);
        const url = URL.createObjectURL(blob);
        if (videoRef.current){
          videoRef.current.src = url;
          videoRef.current.play().catch(()=>{});
        }
        setProgress("Done ✅ (Download available)");
        // Auto download for desktop
        downloadBlob(blob, "ultra-video-maker.webm");
      } else {
        // Canvas preview only
        setProgress(isIOS()
          ? "Done ✅ (iOS: use Desktop Chrome to download video)"
          : "Done ✅"
        );
        // Show the canvas as a video-like preview by exporting a PNG (optional)
      }
    }catch(err){
      console.error(err);
      setProgress("Error: " + (err?.message || "unknown"));
      logAppend(setLog, "Error: " + (err?.message || "unknown"));
    } finally {
      setIsGenerating(false);
    }
  }

  return e("div", { className:"wrap" },
    e("div", { className:"topbar" },
      e("div", { className:"brand" },
        e("div", { className:"chip" }, "Ultra Video Maker"),
        e("div", { className:"chip" }, "One‑Click Product Video (no AI)")
      ),
      e("a", { href:"/", className:"pill" }, "← Back to payment")
    ),

    e("div", { className:"grid" },
      e("div", { className:"card" },
        e("h1", null, "One‑Click Product Video Maker"),
        e("div", { className:"muted" }, "Generate an ecommerce-ready promo video for TikTok / Shopee / Lazada in one click (no AI)."),

        e("div", { className:"statusLine" },
          e("span", { className:"dot ok" }),
          e("span", null, "Paid access: unlocked ✅")
        ),

        e("h2", { style:{ marginTop:"14px"} }, "Product details"),
        e("div", { className:"row" },
          e("div", null,
            e("label", null, "Product name"),
            e("input", { value: productName, onChange: ev=>setProductName(ev.target.value), placeholder:"Darlie Toothpaste" })
          ),
          e("div", null,
            e("label", null, "Brand name (optional)"),
            e("input", { value: brandName, onChange: ev=>setBrandName(ev.target.value), placeholder:"CleanWay / Time Galerie" })
          ),
        ),

        e("div", { className:"row" },
          e("div", null,
            e("label", null, "Price"),
            e("input", { value: price, onChange: ev=>setPrice(ev.target.value), placeholder:"RM99" })
          ),
          e("div", null,
            e("label", null, "Discount badge (optional)"),
            e("input", { value: discount, onChange: ev=>setDiscount(ev.target.value), placeholder:"20% OFF / RM20 OFF" })
          ),
        ),

        e("div", null,
          e("label", null, "Promo text (optional)"),
          e("input", { value: promoText, onChange: ev=>setPromoText(ev.target.value), placeholder:"Online Exclusive • Limited Stock" })
        ),

        e("div", { className:"row" },
          e("div", null,
            e("label", null, "Export preset"),
            e("select", { value: platform, onChange: ev=>setPlatform(ev.target.value) },
              e("option", { value:"tiktok" }, "TikTok style CTA"),
              e("option", { value:"shopee" }, "Shopee style CTA"),
              e("option", { value:"lazada" }, "Lazada style CTA"),
            )
          ),
          e("div", null,
            e("label", null, "Product category preset"),
            e("select", { value: category, onChange: ev=>setCategory(ev.target.value) },
              e("option", { value:"beauty" }, "Beauty"),
              e("option", { value:"home" }, "Home"),
              e("option", { value:"fmcg" }, "FMCG"),
              e("option", { value:"gadget" }, "Gadget"),
              e("option", { value:"watch" }, "Watch"),
            )
          ),
        ),

        e("div", { className:"row" },
          e("div", null,
            e("label", null, "Template style"),
            e("select", { value: template, onChange: ev=>setTemplate(ev.target.value) },
              e("option", { value:"promo" }, "Promo Sale (bold price + CTA)"),
              e("option", { value:"launch" }, "New Arrival (launch style)"),
              e("option", { value:"brand" }, "Simple Brand (clean & minimal)")
            ),
            e("div", { className:"help", style:{ marginTop:"6px"} }, "Brand color auto-theme is based on the category (beauty/home/gadget/watch).")
          ),
          e("div", null,
            e("label", null, "Benefits (bullets)"),
            e("textarea", { value: bullets, onChange: ev=>setBullets(ev.target.value) })
          )
        ),

        e("h2", { style:{ marginTop:"14px"} }, "Logo watermark (optional)"),
        e("div", { className:"row" },
          e("div", null,
            e("input", { type:"file", accept:"image/*", onChange:onLogoUpload }),
            e("div", { className:"help", style:{ marginTop:"6px"} }, "Upload once → auto inserted into every video (stored locally in this browser).")
          ),
          e("div", null,
            e("button", { className:"btn ghost", onClick: clearLogo, disabled: !logoData }, "Remove logo")
          )
        ),

        e("div", { className:"btnRow" },
          e("button", { className:"btn primary", onClick: generate, disabled:isGenerating }, isGenerating ? "Generating…" : "Generate video (1 click)"),
          e("button", { className:"btn", onClick: ()=>window.location.reload() }, "Reset")
        ),

        e("div", { className:"help", style:{ marginTop:"10px"} },
          isIOS()
            ? "iPhone/iPad Pi Browser can preview, but video download may be limited. Best export: Desktop Chrome."
            : "Tip: Desktop Chrome gives the best video download experience."
        ),

        e("div", { className:"statusLine" },
          e("span", { className:"dot " + (progress.includes("Error") ? "bad" : (progress.includes("Done") ? "ok" : "")) }),
          e("span", null, progress || "Ready.")
        ),

        e("pre", { className:"log" }, log || "Logs will appear here.")
      ),

      e("div", { className:"card previewBox" },
        e("h2", null, "Preview"),
        e("div", { className:"stage" },
          e("canvas", { ref: canvasRef })
        ),
        e("video", { ref: videoRef, controls:true, playsInline:true, style:{ display: (canRecord() && !isIOS()) ? "block" : "none" } }),
        e("div", { className:"help" },
          "Background photo library: Beauty/Home/FMCG/Gadget/Watch. If a category folder doesn't exist yet, it falls back to gradient."
        )
      )
    )
  );
}

function NotFoundPage(){
  return e("div", { className:"wrap" },
    e("div", { className:"card" },
      e("h1", null, "Page not found"),
      e("p", { className:"muted" }, "Return to / to start a payment."),
      e("a", { href:"/", className:"btn" }, "Go home")
    )
  );
}

function App(){
  const path = window.location.pathname;
  if (path === "/") return e(PaymentPage);
  if (path === "/create-video") return e(CreateVideoPage);
  return e(NotFoundPage);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(e(App));

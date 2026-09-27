/*
 * Subscription Detective in 24 seconds. Every frame is computed from the time alone (renderAt(ms)),
 * so the tour plays the same in the app and when it is recorded frame by frame for videos and GIFs.
 * Query: ?lang=fr|en, ?f=vertical|square|wide (default: fits the window), ?record=1 (no controls,
 * no clock: the recorder calls window.renderAt), ?t=ms (freeze on a moment).
 */
(function () {
  const q = new URLSearchParams(location.search);
  const lang = q.get("lang") === "en" ? "en" : "fr";
  const record = q.get("record") === "1";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nf = (n, d = 2) => new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", { style: "currency", currency: "EUR", minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

  const T = {
    fr: {
      title: "Subscription Detective, en 24 secondes",
      eyebrow: "Subscription Detective",
      hook: ["Vous payez pour des choses", "que vous avez oubliées."],
      perMonth: "par mois",
      hookCaption: "Exemple : ce que le détective trouve dans le relevé de démonstration.",
      s1: ["Étape 1", "Importez un relevé, ou connectez votre banque"],
      s1b: "En lecture seule. Aucun mot de passe vu.",
      monthly: "chaque mois",
      s2: ["Étape 2", "Il démasque ce que cachent PayPal, Apple et Google"],
      s2b: "Le vrai service, retrouvé grâce à vos reçus.",
      s3: ["Étape 3", "Tous vos abonnements, au même endroit"],
      perYear: "par an",
      total: "Total",
      s4: ["Étape 4", "Vous décidez. Il compte ce que vous économisez."],
      keep: "Je le garde",
      notUsed: "J'ai résilié",
      done: "Résilié",
      saved: "économisés par an",
      s5: ["Et ensuite", "Prévenu avant chaque prélèvement"],
      toast: "Canal+ se renouvelle dans 3 jours",
      toastSmall: "27,99 € le 3 octobre",
      trust: ["Lecture seule", "Données chiffrées", "Gratuit pendant la bêta"],
      cta: "Essayer avec des données fictives",
      back: "Retour à l'application", replay: "Revoir", other: "English (US)",
      subs: [["Google Play", "9,99 € par semaine", "todo", "À décider", 43.29], ["Basic-Fit", "Salle de sport", "todo", "À décider", 29.99], ["Adobe Creative Cloud", "via PayPal", "todo", "À décider", 23.99], ["Free Mobile", "Forfait mobile", "ok", "Actif", 19.99], ["Netflix", "Prélevé depuis 12 mois", "todo", "À décider", 15.99]],
    },
    en: {
      title: "Subscription Detective in 24 seconds",
      eyebrow: "Subscription Detective",
      hook: ["You're paying for things", "you forgot you have."],
      perMonth: "a month",
      hookCaption: "Example: what the detective finds in the demo statement.",
      s1: ["Step 1", "Import a statement, or connect your bank"],
      s1b: "Read-only. No password ever seen.",
      monthly: "every month",
      s2: ["Step 2", "It unmasks what PayPal, Apple and Google hide"],
      s2b: "The real service, found through your receipts.",
      s3: ["Step 3", "All your subscriptions in one place"],
      perYear: "a year",
      total: "Total",
      s4: ["Step 4", "You decide. It counts what you save."],
      keep: "I keep it",
      notUsed: "I canceled it",
      done: "Canceled",
      saved: "saved a year",
      s5: ["And then", "A heads-up before every charge"],
      toast: "Canal+ renews in 3 days",
      toastSmall: "€27.99 on October 3",
      trust: ["Read-only", "Encrypted data", "Free during the beta"],
      cta: "Try with made-up data",
      back: "Back to the app", replay: "Replay", other: "Français",
      subs: [["Google Play", "€9.99 a week", "todo", "To decide", 43.29], ["Basic-Fit", "Gym", "todo", "To decide", 29.99], ["Adobe Creative Cloud", "via PayPal", "todo", "To decide", 23.99], ["Free Mobile", "Mobile plan", "ok", "Active", 19.99], ["Netflix", "Charged for 12 months", "todo", "To decide", 15.99]],
    },
  }[lang];

  const COLORS = { "Google Play": "#3c3f45", "Basic-Fit": "#2fbf5a", "Adobe Creative Cloud": "#3b5bdb", "Free Mobile": "#b5a52a", Netflix: "#d81f26", Spotify: "#1db954", "Canal+": "#111", "iCloud+": "#3a8ef6" };
  const initials = (n) => n.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const icon = (n) => `<span class="icon" style="background:${COLORS[n] || "#5f6477"}">${n === "Netflix" ? "N" : initials(n)}</span>`;

  // Layout: 9:16, 1:1 or 16:9, 720 px on the shorter side, scaled to the window unless recording.
  const stage = document.getElementById("stage");
  const fmt = q.get("f") || (window.innerWidth / window.innerHeight < 0.8 ? "vertical" : window.innerWidth / window.innerHeight < 1.3 ? "square" : "wide");
  const [W, H] = fmt === "vertical" ? [720, 1280] : fmt === "square" ? [720, 720] : [1280, 720];
  document.documentElement.lang = lang === "fr" ? "fr-FR" : "en-US";
  document.title = T.title;
  document.body.classList.toggle("record", record);
  stage.classList.add(fmt);
  const fit = () => {
    const scale = record ? Number(q.get("scale")) || 1 : Math.min(window.innerWidth / W, (window.innerHeight - 60) / H, 1.5);
    stage.style.setProperty("--w", `${W * scale}px`);
    stage.style.setProperty("--h", `${H * scale}px`);
    // A phone screen is tall: everything is drawn 30 % larger there to fill it.
    stage.style.setProperty("--u", `${(Math.min(W, H) / 720) * scale * (fmt === "vertical" ? 1.3 : 1)}`);
  };
  fit();
  window.addEventListener("resize", fit);

  const statement = [
    ["03/09", "PRLV SEPA NETFLIX.COM", "-15,99", 1],
    ["04/09", "CB CARREFOUR MARKET", "-62,40", 0],
    ["05/09", "PAYPAL *EUROPE S.A.R.L", "-23,99", 1],
    ["06/09", "CB SNCF CONNECT", "-48,00", 0],
    ["08/09", "PRLV SEPA BASIC FIT FRANCE", "-29,99", 1],
    ["09/09", "CB BOULANGERIE PAUL", "-6,80", 0],
    ["10/09", "CB SPOTIFY P2F3", "-11,12", 1],
    ["12/09", "CB APPLE.COM/BILL", "-2,99", 1],
    ["13/09", "CB PHARMACIE CENTRALE", "-14,25", 0],
    ["14/09", "PRLV SEPA FREE MOBILE", "-19,99", 1],
  ];

  const scenes = [
    { from: 0, to: 3400, html: () => `
      <div class="scene">
        <div class="eyebrow"><b></b>${T.eyebrow}</div>
        <h1 class="title"><span data-a="0">${T.hook[0]}</span><span class="soft" data-a="1">${T.hook[1]}</span></h1>
        <div class="big" data-a="2"><span id="hookNum">0</span><em>${T.perMonth}</em></div>
        <p class="caption" data-a="3">${T.hookCaption}</p>
      </div>` },
    { from: 3400, to: 7600, html: () => `
      <div class="scene"><div class="split">
        <div><p class="step"><small>${T.s1[0]}</small>${T.s1[1]}</p><p class="caption" style="margin-top:.8em">${T.s1b}</p></div>
        <div class="card"><div class="rows" id="rows">${statement.map((r, i) => `<div class="row" data-r="${i}"><span class="d">${r[0]}</span><span class="l">${r[1]}</span><span class="a">${r[2]}</span></div>`).join("")}<div class="scan" id="scan"></div></div></div>
      </div></div>` },
    { from: 7600, to: 11600, html: () => `
      <div class="scene"><div class="split">
        <div><p class="step"><small>${T.s2[0]}</small>${T.s2[1]}</p><p class="caption" style="margin-top:.8em">${T.s2b}</p>
          <div class="sources" style="margin-top:1em"><span>PayPal</span><span>Apple</span><span>Google Play</span></div></div>
        <div class="card unmask">
          <div class="flip"><div class="before" id="before">PAYPAL *EUROPE S.A.R.L &nbsp; -23,99</div><div class="after" id="after">${icon("Adobe Creative Cloud")}<span>Adobe Creative Cloud</span><b>${nf(23.99)}</b></div></div>
          <div class="flip"><div class="before" id="before2">CB APPLE.COM/BILL &nbsp; -2,99</div><div class="after" id="after2">${icon("iCloud+")}<span>iCloud+ 50 ${lang === "fr" ? "Go" : "GB"}</span><b>${nf(2.99)}</b></div></div>
          <div class="lens" id="lens"></div>
        </div>
      </div></div>` },
    { from: 11600, to: 15800, html: () => `
      <div class="scene"><div class="split">
        <div><p class="step"><small>${T.s3[0]}</small>${T.s3[1]}</p></div>
        <div class="card">${T.subs.map((s, i) => `<div class="sub" data-s="${i}">${icon(s[0])}<div><div class="n">${s[0]}</div><div class="s">${s[1]}</div><span class="chip ${s[2]}">${s[3]}</span></div><div class="p">${nf(s[4])}</div></div>`).join("")}
          <div class="total"><span>${T.total}</span><span><span id="totalNum">0</span> ${T.perYear}</span></div></div>
      </div></div>` },
    { from: 15800, to: 20000, html: () => `
      <div class="scene"><div class="split">
        <div><p class="step"><small>${T.s4[0]}</small>${T.s4[1]}</p><div class="saving" id="saving" style="margin-top:.5em">+${nf(192, 0)} <span style="font-size:.45em;color:rgba(255,255,255,.85);font-weight:700">${T.saved}</span></div></div>
        <div class="card" style="position:relative">
          <div class="sub">${icon("Netflix")}<div><div class="n">Netflix</div><div class="s">${T.subs[4][1]}</div><span class="chip todo" id="nchip">${T.subs[4][3]}</span></div><div class="p">${nf(15.99)}</div></div>
          <div class="btns"><span class="btn">${T.keep}</span><span class="btn" id="notUsed">${T.notUsed}</span></div>
          <div class="cursor" id="cursor"></div>
        </div>
      </div></div>` },
    { from: 20000, to: 22200, html: () => `
      <div class="scene"><div class="split">
        <div><p class="step"><small>${T.s5[0]}</small>${T.s5[1]}</p></div>
        <div style="display:grid;gap:calc(var(--u)*18px)"><div class="cal" id="cal">${Array.from({ length: 28 }, (_, i) => `<i data-c="${i}" class="${[2, 4, 7, 9, 13, 16, 23].includes(i) ? "dot" : ""} ${i === 11 ? "today" : ""}"></i>`).join("")}</div>
        <div class="toast" id="toast">${icon("Canal+")}<div>${T.toast}<small>${T.toastSmall}</small></div></div></div>
      </div></div>` },
    { from: 22200, to: 24000, html: () => `
      <div class="scene center">
        <svg class="logo" viewBox="0 0 32 32" aria-hidden="true" data-a="0"><defs><linearGradient id="tl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4f7bff"/><stop offset="1" stop-color="#1b3fb8"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#tl)" stroke="rgba(255,255,255,.5)"/><circle cx="14" cy="14" r="6.5" fill="none" stroke="#fff" stroke-width="2.4"/><path d="m19 19 5.5 5.5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="14" cy="14" r="2.2" fill="#ff5a36"/></svg>
        <div class="brandname" data-a="1">Subscription <span>Detective</span></div>
        <div class="trust" data-a="2" style="justify-content:center">${T.trust.map((t) => `<span>${t}</span>`).join("")}</div>
        <div data-a="3"><span class="cta">${T.cta}</span></div>
      </div>` },
  ];
  const TOTAL = 24000;

  const root = document.getElementById("scenes");
  root.innerHTML = scenes.map((s, i) => `<div class="layer" data-scene="${i}" style="position:absolute;inset:0">${s.html()}</div>`).join("") +
    `<div class="progress">${scenes.map(() => "<i><b></b></i>").join("")}</div>`;
  document.getElementById("transcript").innerHTML = [T.hook.join(" "), T.s1[1], T.s2[1], T.s3[1], T.s4[1], T.s5[1], T.cta].map((t) => `<li>${t}</li>`).join("");
  const layers = [...root.querySelectorAll(".layer")];
  const bars = [...root.querySelectorAll(".progress b")];
  const $ = (id) => document.getElementById(id);

  const clamp = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
  const inOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const appear = (el, p) => { if (!el) return; el.style.opacity = ease(p); el.style.transform = `translateY(${(1 - ease(p)) * 24}px)`; };

  function renderAt(ms) {
    const t = ((ms % TOTAL) + TOTAL) % TOTAL;
    scenes.forEach((s, i) => {
      const L = layers[i];
      const inP = (t - s.from) / 450, outP = (s.to - t) / 350;
      const on = t >= s.from - 1 && t < s.to + 350;
      const vis = on ? Math.min(ease(inP), i === scenes.length - 1 ? 1 : clamp(outP)) : 0;
      L.style.opacity = vis;
      L.style.transform = `scale(${0.98 + 0.02 * vis})`;
      L.style.visibility = vis > 0.001 ? "visible" : "hidden";
      bars[i].style.width = `${clamp((t - s.from) / (s.to - s.from)) * 100}%`;
      if (!on) return;
      const lt = t - s.from; // time in the scene
      L.querySelectorAll("[data-a]").forEach((el) => appear(el, (lt - Number(el.dataset.a) * 260) / 500));
      if (i === 0) $("hookNum").textContent = nf(153.19 * ease((lt - 700) / 1500));
      if (i === 1) {
        const rows = L.querySelectorAll(".row");
        rows.forEach((r, k) => { appear(r, (lt - 150 - k * 90) / 350); });
        const scanP = clamp((lt - 1300) / 2200);
        $("scan").style.top = `${scanP * 100}%`;
        $("scan").style.opacity = lt > 1300 && lt < 3600 ? 1 : 0;
        rows.forEach((r, k) => {
          const hit = statement[k][3] && scanP * rows.length > k + 0.5;
          r.classList.toggle("hit", !!hit);
          const tag = r.querySelector(".tag");
          if (hit && !tag) r.querySelector(".l").insertAdjacentHTML("beforeend", `<span class="tag">${T.monthly}</span>`);
          if (!hit && tag) tag.remove();
        });
      }
      if (i === 2) {
        const flipA = inOut((lt - 1100) / 600), flipB = inOut((lt - 2300) / 600);
        $("before").style.opacity = 1 - flipA; $("after").style.opacity = flipA; $("after").style.transform = `rotateX(${(1 - flipA) * 70}deg)`;
        $("before2").style.opacity = 1 - flipB; $("after2").style.opacity = flipB; $("after2").style.transform = `rotateX(${(1 - flipB) * 70}deg)`;
        const lens = $("lens"), card = lens.parentElement, u = card.clientWidth;
        const path = inOut((lt - 300) / 2600);
        lens.style.left = `${(0.08 + 0.6 * Math.sin(path * Math.PI)) * u}px`;
        lens.style.top = `${card.clientHeight * (0.08 + 0.5 * path)}px`;
        lens.style.opacity = lt > 200 && lt < 3600 ? 1 : 0;
      }
      if (i === 3) {
        L.querySelectorAll(".sub").forEach((r, k) => appear(r, (lt - 200 - k * 180) / 380));
        $("totalNum").textContent = nf(1838 * ease((lt - 1300) / 1800), 0);
      }
      if (i === 4) {
        const cur = $("cursor"), btn = $("notUsed"), card = cur.parentElement;
        const b = btn.offsetLeft + btn.offsetWidth * 0.5, c = btn.offsetTop + btn.offsetHeight * 0.5;
        const mv = inOut((lt - 300) / 1100);
        cur.style.left = `${card.clientWidth * 0.9 + (b - card.clientWidth * 0.9) * mv - cur.offsetWidth / 2}px`;
        cur.style.top = `${card.clientHeight * 1.1 + (c - card.clientHeight * 1.1) * mv - cur.offsetHeight / 2}px`;
        const pressed = lt > 1500;
        cur.style.transform = `scale(${lt > 1450 && lt < 1650 ? 0.8 : 1})`;
        btn.classList.toggle("on", pressed);
        $("nchip").className = `chip ${pressed ? "ok" : "todo"}`;
        $("nchip").textContent = pressed ? T.done : T.subs[4][3];
        appear($("saving"), (lt - 1800) / 500);
      }
      if (i === 5) {
        L.querySelectorAll("#cal i").forEach((c, k) => appear(c, (lt - k * 18) / 300));
        appear($("toast"), (lt - 900) / 450);
      }
    });
  }
  window.renderAt = renderAt;
  window.TOUR_MS = TOTAL;

  const replay = document.getElementById("replay");
  const langLink = document.getElementById("lang");
  document.getElementById("back").textContent = T.back;
  replay.textContent = T.replay;
  langLink.textContent = T.other;
  langLink.href = `?lang=${lang === "fr" ? "en" : "fr"}${q.get("f") ? `&f=${q.get("f")}` : ""}`;

  if (q.has("t")) return renderAt(Number(q.get("t")) || 0);
  if (record) return renderAt(0);
  if (reduce) return renderAt(23900);
  let start = performance.now();
  replay.addEventListener("click", () => (start = performance.now()));
  document.fonts.ready.then(() => {
    const loop = (now) => { renderAt(now - start); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
})();

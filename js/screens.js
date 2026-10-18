import { canvasTexture, roundRect } from "./util.js";

// ---------- wspolne ----------
const FONT = "'Segoe UI', 'Inter', system-ui, sans-serif";
const MONO = "'Cascadia Code', 'Consolas', monospace";
function grad(ctx, x0, y0, x1, y1, stops){
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(function(s){ g.addColorStop(s[0], s[1]); });
  return g;
}

// ---------- monitor glowny: zgloszenie w Jira + diagram BPMN rysowany w trakcie pisania ----------
const TICKET = [
  "Jako przedstawiciel handlowy chcę, aby asystent AI",
  "podpowiadał pozycje zamówienia na podstawie historii",
  "klienta, promocji pakietowych i stanów magazynowych.",
  "",
  "Kryteria akceptacji:",
  "  • podpowiedź w < 2 s, działa offline z cache",
  "  • uwzględnia prolongaty i limity kredytowe",
  "  • zapis do ERP przez REST API (JSON)",
  "  • telemetria: czas, trafność, odrzucenia"
];
export function mainMonitor(){
  const W = 1024, H = 640;
  const s = canvasTexture(W, H);
  let chars = 0, cursor = 0, clock = 0;
  const total = TICKET.join("\n").length;
  function draw(){
    const ctx = s.ctx;
    ctx.fillStyle = "#11131f"; ctx.fillRect(0, 0, W, H);
    // pasek aplikacji
    ctx.fillStyle = "#1b1e30"; ctx.fillRect(0, 0, W, 46);
    ctx.fillStyle = "#9b5cff"; roundRect(ctx, 16, 12, 22, 22, 6); ctx.fill();
    ctx.fillStyle = "#cfd3ea"; ctx.font = "600 18px " + FONT; ctx.fillText("Jira  ·  Comarch Mobile  ·  Sprint 42", 50, 30);
    ["#ff5f57", "#febc2e", "#28c840"].forEach(function(c, i){ ctx.fillStyle = c; ctx.beginPath(); ctx.arc(W - 70 + i * 20, 23, 6, 0, 7); ctx.fill(); });
    // naglowek zgloszenia
    ctx.fillStyle = "#2de2e6"; ctx.font = "700 16px " + FONT; ctx.fillText("MOB-1428", 28, 84);
    ctx.fillStyle = "#ffffff"; ctx.font = "700 26px " + FONT; ctx.fillText("Asystent zamówień AI — podpowiedzi pozycji", 28, 118);
    ctx.fillStyle = "#3a3f63"; roundRect(ctx, 28, 134, 120, 26, 13); ctx.fill();
    ctx.fillStyle = "#cfd3ea"; ctx.font = "600 14px " + FONT; ctx.fillText("W ANALIZIE", 46, 152);
    // tresc pisana na zywo
    const text = TICKET.join("\n").slice(0, chars).split("\n");
    ctx.font = "18px " + FONT; ctx.fillStyle = "#c3c8e4";
    let y = 196;
    text.forEach(function(line){ ctx.fillText(line, 28, y); y += 28; });
    if(cursor % 2 === 0){ const last = text[text.length - 1] || ""; ctx.fillStyle = "#2de2e6"; ctx.fillRect(28 + ctx.measureText(last).width + 2, y - 48, 2, 22); }
    // mini BPMN po prawej - kolejne elementy pojawiaja sie wraz z postepem
    const p = chars / total;
    const nodes = [[640, 470, "Start"], [740, 470, "Historia"], [860, 470, "Promocje"], [860, 570, "AI"], [740, 570, "Zamówienie"]];
    ctx.lineWidth = 3;
    nodes.forEach(function(n, i){
      if(p < i / nodes.length) return;
      if(i > 0){ const a = nodes[i - 1]; ctx.strokeStyle = "#5b6190"; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(n[0], n[1]); ctx.stroke(); }
    });
    nodes.forEach(function(n, i){
      if(p < i / nodes.length) return;
      ctx.fillStyle = i === 3 ? "#9b5cff" : "#23273f"; ctx.strokeStyle = i === 0 ? "#28c840" : "#2de2e6";
      if(i === 0){ ctx.beginPath(); ctx.arc(n[0], n[1], 18, 0, 7); ctx.fill(); ctx.stroke(); }
      else { roundRect(ctx, n[0] - 52, n[1] - 22, 104, 44, 10); ctx.fill(); ctx.stroke(); ctx.fillStyle = "#e6e8f5"; ctx.font = "600 14px " + FONT; ctx.textAlign = "center"; ctx.fillText(n[2], n[0], n[1] + 5); ctx.textAlign = "left"; }
    });
    s.tex.needsUpdate = true;
  }
  draw();
  return {
    tex: s.tex,
    update: function(dt, typing){
      clock += dt;
      if(typing) chars = Math.min(total, chars + dt * 26);
      if(chars >= total){ clock += 0; if(clock > 4){ chars = 0; clock = 0; } } else clock = 0;
      cursor = Math.floor(performance.now() / 500);
      draw();
    }
  };
}

// ---------- monitor boczny: SQL + wynik + logi API ----------
const SQL = ["SELECT TOP 5 k.Nazwa, SUM(z.Wartosc) AS Obrot", "FROM Zamowienia z JOIN Kontrahenci k", "  ON k.Id = z.KontrahentId", "WHERE z.Data >= DATEADD(day,-30,GETDATE())", "GROUP BY k.Nazwa ORDER BY Obrot DESC;"];
const ROWS = [["Hurtownia Lublin", "184 220"], ["Market Zamość", "151 870"], ["Delikatesy Chełm", "98 410"], ["Sklep Puławy", "76 300"], ["Kiosk Biała", "41 950"]];
const LOGS = ["POST /api/orders 201 112ms", "GET /api/stock?sku=4411 200 38ms", "POST /api/ai/suggest 200 640ms", "PUT /api/promo/bundle 200 71ms", "GET /api/clients/88 200 22ms", "POST /api/telemetry 202 9ms", "GET /api/prices 200 54ms"];
export function sideMonitor(){
  const W = 640, H = 1024;
  const s = canvasTexture(W, H);
  let t = 0, logOff = 0;
  function draw(){
    const ctx = s.ctx;
    ctx.fillStyle = "#0f1220"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#1b1e30"; ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = "#cfd3ea"; ctx.font = "600 17px " + FONT; ctx.fillText("SQL Server · ERP_XL", 18, 29);
    ctx.font = "17px " + MONO;
    SQL.forEach(function(l, i){
      ctx.fillStyle = "#5b6190"; ctx.fillText(String(i + 1), 16, 84 + i * 26);
      const kw = l.replace(/(SELECT|TOP|FROM|JOIN|ON|WHERE|GROUP BY|ORDER BY|AS|DESC|SUM)/g, "§$1§").split("§");
      let x = 46;
      kw.forEach(function(part){
        ctx.fillStyle = /^(SELECT|TOP|FROM|JOIN|ON|WHERE|GROUP BY|ORDER BY|AS|DESC|SUM)$/.test(part) ? "#c792ea" : "#d6dbf5";
        ctx.fillText(part, x, 84 + i * 26); x += ctx.measureText(part).width;
      });
    });
    // tabela wynikow, wiersze pojawiaja sie po kolei
    const shown = Math.min(ROWS.length, Math.floor((t % 9) / 0.6));
    ctx.fillStyle = "#1a1e33"; ctx.fillRect(16, 236, W - 32, 34);
    ctx.fillStyle = "#2de2e6"; ctx.font = "700 16px " + FONT; ctx.fillText("Nazwa", 28, 259); ctx.fillText("Obrót [zł]", W - 150, 259);
    ctx.font = "16px " + FONT;
    for(let i = 0; i < shown; i++){
      ctx.fillStyle = i % 2 ? "#141829" : "#171b2e"; ctx.fillRect(16, 272 + i * 34, W - 32, 34);
      ctx.fillStyle = "#d6dbf5"; ctx.fillText(ROWS[i][0], 28, 295 + i * 34); ctx.fillText(ROWS[i][1], W - 150, 295 + i * 34);
    }
    // wykres slupkowy
    const base = 680;
    ctx.strokeStyle = "#2a2f4a"; ctx.beginPath(); ctx.moveTo(30, base); ctx.lineTo(W - 30, base); ctx.stroke();
    for(let i = 0; i < 8; i++){
      const h = 60 + 120 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.9));
      ctx.fillStyle = i % 2 ? "#9b5cff" : "#2de2e6";
      roundRect(ctx, 46 + i * 70, base - h, 40, h, 6); ctx.fill();
    }
    // logi API przewijane
    ctx.fillStyle = "#0b0d18"; ctx.fillRect(16, 712, W - 32, H - 730);
    ctx.font = "15px " + MONO;
    for(let i = 0; i < 10; i++){
      const line = LOGS[(i + logOff) % LOGS.length];
      const ok = / 20[0-9] /.test(line);
      ctx.fillStyle = ok ? "#28c840" : "#ff5f57"; ctx.fillText("●", 28, 742 + i * 27);
      ctx.fillStyle = "#9aa1c8"; ctx.fillText(line, 50, 742 + i * 27);
    }
    s.tex.needsUpdate = true;
  }
  draw();
  return { tex: s.tex, update: function(dt){ t += dt; if(Math.floor(t * 1.4) !== Math.floor((t - dt) * 1.4)) logOff++; draw(); } };
}

// ---------- TV: serwis gieldowy z prezenterka ----------
const STOCKS = [
  { name: "Comarch", tick: "CMR", price: "742,50 zł", ch: +8.4, color: "#2b9be8", head: { pl: "Comarch w górę po premierze asystenta AI", en: "Comarch up after AI assistant launch" } },
  { name: "NVIDIA", tick: "NVDA", price: "$1 218,40", ch: +3.1, color: "#76b900", head: { pl: "Popyt na układy AI nie słabnie", en: "AI chip demand keeps growing" } },
  { name: "Anthropic", tick: "ANTH", price: "$412,05", ch: +12.7, color: "#d97757", head: { pl: "Anthropic bije rekordy po nowej wersji Claude", en: "Anthropic hits record after new Claude" } },
  { name: "Apple", tick: "AAPL", price: "$268,90", ch: +1.8, color: "#e8e8ed", head: { pl: "Apple stabilnie przed premierą sprzętu", en: "Apple steady ahead of hardware launch" } },
  { name: "amazon", tick: "AMZN", price: "$241,15", ch: +2.3, color: "#ff9900", head: { pl: "Chmura AWS ciągnie wyniki Amazona", en: "AWS cloud lifts Amazon results" } },
  { name: "Microsoft", tick: "MSFT", price: "$498,30", ch: -0.9, color: "#00a4ef", head: { pl: "Microsoft lekko w dół po rekordowym tygodniu", en: "Microsoft dips after record week" } },
  { name: "Tesla", tick: "TSLA", price: "$228,60", ch: -2.6, color: "#e82127", head: { pl: "Tesla traci po słabszych dostawach", en: "Tesla slides on weaker deliveries" } }
];
function spark(seed, up){
  const pts = []; let v = 0.5;
  for(let i = 0; i < 40; i++){ v += (Math.sin(seed * 9.1 + i * 1.7) * 0.06) + (up ? 0.012 : -0.012); pts.push(Math.max(0.05, Math.min(0.95, v))); }
  return pts;
}
export function tvScreen(getLang){
  const W = 1024, H = 576;
  const s = canvasTexture(W, H);
  let t = 0;
  const sparks = STOCKS.map(function(st, i){ return spark(i + 1, st.ch > 0); });
  function reporter(ctx, talk){
    const x = 210, y = 300;
    // studio za prezenterka
    ctx.fillStyle = "rgba(45,226,230,.08)"; ctx.beginPath(); ctx.arc(x, y - 30, 170, 0, 7); ctx.fill();
    // wlosy (tyl)
    ctx.fillStyle = "#4a2c1d"; ctx.beginPath(); ctx.ellipse(x, y - 70, 74, 92, 0, 0, 7); ctx.fill();
    ctx.fillRect(x - 74, y - 70, 148, 120);
    // szyja + zakiet
    ctx.fillStyle = "#e2a985"; ctx.fillRect(x - 18, y - 10, 36, 40);
    ctx.fillStyle = "#2a3d7c"; ctx.beginPath(); ctx.moveTo(x - 120, y + 160); ctx.quadraticCurveTo(x - 110, y + 30, x - 30, y + 22); ctx.lineTo(x + 30, y + 22); ctx.quadraticCurveTo(x + 110, y + 30, x + 120, y + 160); ctx.fill();
    ctx.fillStyle = "#f1f1f6"; ctx.beginPath(); ctx.moveTo(x - 30, y + 22); ctx.lineTo(x, y + 80); ctx.lineTo(x + 30, y + 22); ctx.fill();
    // twarz
    ctx.fillStyle = "#efbc98"; ctx.beginPath(); ctx.ellipse(x, y - 62, 56, 68, 0, 0, 7); ctx.fill();
    // grzywka
    ctx.fillStyle = "#4a2c1d"; ctx.beginPath(); ctx.ellipse(x - 14, y - 118, 62, 30, -0.25, 0, 7); ctx.fill();
    // oczy (mruganie)
    const blink = (Math.floor(t * 10) % 37) === 0;
    ctx.fillStyle = "#2b1d18";
    if(blink){ ctx.fillRect(x - 28, y - 70, 16, 3); ctx.fillRect(x + 12, y - 70, 16, 3); }
    else { ctx.beginPath(); ctx.ellipse(x - 20, y - 68, 6, 8, 0, 0, 7); ctx.ellipse(x + 20, y - 68, 6, 8, 0, 0, 7); ctx.fill(); }
    // usta - mowi
    const open = talk ? 3 + Math.abs(Math.sin(t * 13)) * 9 : 3;
    ctx.fillStyle = "#b8504f"; ctx.beginPath(); ctx.ellipse(x, y - 28, 14, open / 2 + 2, 0, 0, 7); ctx.fill();
    // kolczyki
    ctx.fillStyle = "#f2cf6b"; ctx.beginPath(); ctx.arc(x - 56, y - 50, 5, 0, 7); ctx.arc(x + 56, y - 50, 5, 0, 7); ctx.fill();
    // blat studia
    ctx.fillStyle = grad(ctx, 0, y + 100, 0, H, [[0, "#1d2a55"], [1, "#0d1430"]]);
    ctx.fillRect(40, y + 100, 360, 160);
    ctx.fillStyle = "#2de2e6"; ctx.fillRect(40, y + 100, 360, 4);
    ctx.fillStyle = "#ffffff"; ctx.font = "800 22px " + FONT; ctx.textAlign = "center"; ctx.fillText("TECH MARKETS", 220, y + 140); ctx.textAlign = "left";
  }
  function draw(){
    const ctx = s.ctx, lang = getLang();
    const slot = 4.5, idx = Math.floor(t / slot) % STOCKS.length, local = (t % slot) / slot;
    const st = STOCKS[idx], up = st.ch > 0;
    ctx.fillStyle = grad(ctx, 0, 0, W, H, [[0, "#0a1636"], [1, "#081026"]]); ctx.fillRect(0, 0, W, H);
    // tlo: siatka i swiece gieldowe
    ctx.strokeStyle = "rgba(90,120,200,.12)"; ctx.lineWidth = 1;
    for(let gx = 0; gx < W; gx += 48){ ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for(let gy = 0; gy < H; gy += 48){ ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
    for(let i = 0; i < 26; i++){
      const cx = ((i * 44 - t * 30) % (W + 60) + W + 60) % (W + 60) - 30;
      const o = 200 + Math.sin(i * 1.3) * 60, c = o + Math.sin(i * 2.1 + 1) * 40;
      ctx.fillStyle = c < o ? "rgba(40,200,64,.25)" : "rgba(255,95,87,.22)";
      ctx.fillRect(cx, Math.min(o, c), 14, Math.abs(c - o) + 4);
      ctx.fillRect(cx + 6, Math.min(o, c) - 14, 2, Math.abs(c - o) + 32);
    }
    reporter(ctx, true);
    // karta spolki (wjezdza z prawej)
    const slide = Math.min(1, local * 6), x0 = 470 + (1 - slide) * 300;
    ctx.globalAlpha = slide;
    ctx.fillStyle = "rgba(10,18,44,.92)"; roundRect(ctx, x0, 70, 510, 330, 22); ctx.fill();
    ctx.strokeStyle = st.color; ctx.lineWidth = 3; roundRect(ctx, x0, 70, 510, 330, 22); ctx.stroke();
    ctx.fillStyle = st.color; ctx.font = "800 64px " + FONT; ctx.fillText(st.name, x0 + 32, 150);
    ctx.fillStyle = "#9aa6d6"; ctx.font = "600 22px " + FONT; ctx.fillText(st.tick + (st.tick === "CMR" || st.tick === "ANTH" ? " · symulacja" : ""), x0 + 34, 186);
    ctx.fillStyle = "#ffffff"; ctx.font = "700 40px " + FONT; ctx.fillText(st.price, x0 + 32, 246);
    ctx.fillStyle = up ? "#28c840" : "#ff5f57"; ctx.font = "800 46px " + FONT;
    ctx.fillText((up ? "▲ +" : "▼ ") + st.ch.toFixed(1).replace(".", ",") + "%", x0 + 260, 246);
    // wykres rysowany w czasie
    const pts = sparks[idx], n = Math.max(2, Math.floor(pts.length * Math.min(1, local * 1.6)));
    ctx.strokeStyle = up ? "#28c840" : "#ff5f57"; ctx.lineWidth = 4; ctx.beginPath();
    for(let i = 0; i < n; i++){ const px = x0 + 34 + i * 11.4, py = 380 - pts[i] * 110; if(i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // naglowek LIVE
    ctx.fillStyle = "#e5203a"; roundRect(ctx, 24, 22, 86, 34, 6); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "800 20px " + FONT; ctx.fillText("LIVE", 42, 46);
    if(Math.floor(t * 2) % 2){ ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(34, 39, 4, 0, 7); ctx.fill(); }
    ctx.fillStyle = "#dfe6ff"; ctx.font = "700 20px " + FONT; ctx.fillText("BIZ TECH 24", 124, 46);
    // pasek z tytulem (lower third)
    ctx.fillStyle = "#e5203a"; ctx.fillRect(0, H - 104, 150, 50);
    ctx.fillStyle = "#fff"; ctx.font = "800 22px " + FONT; ctx.fillText(lang === "en" ? "BREAKING" : "PILNE", 22, H - 71);
    ctx.fillStyle = "rgba(245,247,255,.96)"; ctx.fillRect(150, H - 104, W - 150, 50);
    ctx.fillStyle = "#101a3a"; ctx.font = "700 24px " + FONT; ctx.fillText(st.head[lang] || st.head.pl, 170, H - 70);
    // tasma z notowaniami
    ctx.fillStyle = "#050a1c"; ctx.fillRect(0, H - 54, W, 54);
    ctx.font = "700 22px " + FONT;
    let tx = -((t * 90) % 1400);
    for(let r = 0; r < 3; r++){
      STOCKS.forEach(function(q){
        ctx.fillStyle = "#cdd6ff"; ctx.fillText(q.tick, tx, H - 20); tx += ctx.measureText(q.tick + " ").width;
        ctx.fillStyle = q.ch > 0 ? "#28c840" : "#ff5f57"; const v = (q.ch > 0 ? "▲" : "▼") + Math.abs(q.ch).toFixed(1) + "%   ";
        ctx.fillText(v, tx, H - 20); tx += ctx.measureText(v).width;
      });
    }
    s.tex.needsUpdate = true;
  }
  draw();
  let acc = 0;
  return { tex: s.tex, update: function(dt){ t += dt; acc += dt; if(acc > 1 / 24){ acc = 0; draw(); } } };
}

// ---------- zdjecia firm na scianie ----------
// ramka z prawdziwym logo firmy (assets/logos) i latami pracy; logo wczytywane asynchronicznie
export const LOGOS = {
  comarch: { src: "assets/logos/comarch.png", bg: "#ffffff" },
  aldi: { src: "assets/logos/aldi.png", bg: "#ffffff" },
  specjal: { src: "assets/logos/specjal.png", bg: "#ffffff" },
  komfort: { src: "assets/logos/komfort.svg", bg: "#c8102e" },   // logo Komfort jest biale - na firmowej czerwieni
  auchan: { src: "assets/logos/auchan.png", bg: "#ffffff" }
};
export function companyPhoto(key, name, years){
  const L = LOGOS[key], W = 400, H = 500;
  const s = canvasTexture(W, H);
  function draw(img){
    const ctx = s.ctx;
    ctx.fillStyle = L.bg; ctx.fillRect(0, 0, W, H);
    if(img){
      const maxW = W * 0.78, maxH = H * 0.52, k = Math.min(maxW / img.width, maxH / img.height);
      const iw = img.width * k, ih = img.height * k;
      ctx.drawImage(img, (W - iw) / 2, H * 0.4 - ih / 2, iw, ih);
    } else { ctx.fillStyle = "#1b1d2e"; ctx.textAlign = "center"; ctx.font = "800 40px " + FONT; ctx.fillText(name, W / 2, H * 0.42); }
    ctx.fillStyle = "#1f2240"; ctx.fillRect(0, H * 0.8, W, H * 0.2);
    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.font = "700 34px " + FONT; ctx.fillText(years, W / 2, H * 0.915);
    s.tex.needsUpdate = true;
  }
  draw(null);
  const img = new Image();
  img.onload = function(){ draw(img); };
  img.src = L.src;
  return s.tex;
}

// ---------- certyfikat w stylu cyberpunk: holograficzny panel z neonowym obrysem ----------
export function certificate(title, year, accent){
  return canvasTexture(600, 440, function(ctx, w, h){
    ctx.fillStyle = grad(ctx, 0, 0, w, h, [[0, "#0b0f24"], [1, "#160a2c"]]); ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(45,226,230,.10)"; ctx.lineWidth = 1;
    for(let x = 0; x < w; x += 24){ ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for(let y = 0; y < h; y += 24){ ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    for(let y = 0; y < h; y += 4){ ctx.fillStyle = "rgba(255,255,255,.025)"; ctx.fillRect(0, y, w, 1); }   // linie skanowania
    // scieta neonowa ramka
    const c = 34;
    ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 22; ctx.strokeStyle = accent; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(c + 14, 14); ctx.lineTo(w - 14, 14); ctx.lineTo(w - 14, h - c - 14); ctx.lineTo(w - c - 14, h - 14); ctx.lineTo(14, h - 14); ctx.lineTo(14, c + 14); ctx.closePath(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = accent; ctx.fillRect(40, 40, 120, 8); ctx.fillRect(w - 110, h - 52, 70, 6);
    ctx.fillStyle = accent; ctx.font = "700 24px " + MONO; ctx.fillText("// CERT_" + year, 40, 92);
    ctx.fillStyle = "#ffffff"; ctx.font = "800 44px " + FONT;
    ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 14;
    const words = title.split(" "), lines = []; let cur = "";
    words.forEach(function(wd){ if(ctx.measureText(cur + " " + wd).width > w - 90){ lines.push(cur); cur = wd; } else cur = cur ? cur + " " + wd : wd; });
    lines.push(cur);
    lines.forEach(function(l, i){ ctx.fillText(l, 40, 170 + i * 52); });
    ctx.restore();
    // znaczek "VERIFIED" i pseudo-kod QR
    ctx.strokeStyle = "#28c840"; ctx.lineWidth = 3; roundRect(ctx, 40, h - 92, 170, 40, 8); ctx.stroke();
    ctx.fillStyle = "#28c840"; ctx.font = "800 22px " + MONO; ctx.fillText("✔ VERIFIED", 54, h - 64);
    for(let i = 0; i < 7; i++) for(let j = 0; j < 7; j++) if((i * 7 + j * 3 + year.length) % 3) { ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillRect(w - 150 + i * 12, 60 + j * 12, 10, 10); }
  }).tex;
}

// ---------- tablica w stylu Miro: kropkowane tlo, ramki z karteczkami, strzalki, kursory wspolpracownikow ----------
export function skillsBoard(){
  const W = 1248, H = 776;
  const s = canvasTexture(W, H);
  let t = 0, acc = 1;
  const frames = [
    { x: 70, y: 70, w: 360, h: 300, title: "Analiza", notes: [["Wymagania\nbiznesowe", "#fff17a"], ["BPMN\nUML", "#fff17a"], ["UI / UX\nmobile", "#ffd3e2"], ["Testy\nprojekt.", "#ffd3e2"]] },
    { x: 470, y: 70, w: 360, h: 300, title: "Technologie", notes: [["SQL\nT-SQL", "#c9f0ff"], ["REST API\nJSON·XML", "#c9f0ff"], ["Comarch\nERP", "#d5f5c7"], ["Jira\nFigma", "#d5f5c7"]] },
    { x: 870, y: 70, w: 320, h: 300, title: "AI", notes: [["Agenci\nAI", "#e4d7ff"], ["Prompt\neng.", "#e4d7ff"], ["Automa-\ntyzacja", "#ffe0b8"], ["Claude\nGemini", "#ffe0b8"]] }
  ];
  const flow = [[150, 520, "Wymaganie"], [400, 520, "Analiza"], [650, 520, "Projekt UI"], [900, 520, "Wdrożenie"]];
  const cursors = [{ n: "Dariusz", c: "#7b4dff", p: 0 }, { n: "PM", c: "#ff4f8b", p: 2.1 }, { n: "Dev", c: "#00b37e", p: 4.2 }];
  function arrow(ctx, x1, y1, x2, y2){
    ctx.strokeStyle = "#4b5563"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1); ctx.fillStyle = "#4b5563"; ctx.beginPath();
    ctx.moveTo(x2, y2); ctx.lineTo(x2 - 14 * Math.cos(a - 0.4), y2 - 14 * Math.sin(a - 0.4)); ctx.lineTo(x2 - 14 * Math.cos(a + 0.4), y2 - 14 * Math.sin(a + 0.4)); ctx.fill();
  }
  function draw(){
    const ctx = s.ctx;
    ctx.fillStyle = "#f5f6f8"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#d4d7de"; for(let x = 12; x < W; x += 24) for(let y = 12; y < H; y += 24) ctx.fillRect(x, y, 2, 2);
    // ramki z karteczkami
    frames.forEach(function(f){
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#e1e4ea"; ctx.lineWidth = 2; ctx.fillRect(f.x, f.y, f.w, f.h); ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.fillStyle = "#5b6070"; ctx.font = "600 22px " + FONT; ctx.fillText(f.title, f.x, f.y - 12);
      f.notes.forEach(function(n, i){
        const nx = f.x + 24 + (i % 2) * ((f.w - 48) / 2 + 8), ny = f.y + 26 + Math.floor(i / 2) * 136, nw = (f.w - 64) / 2, nh = 118;
        ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.fillRect(nx + 3, ny + 5, nw, nh);
        ctx.fillStyle = n[1]; ctx.fillRect(nx, ny, nw, nh);
        ctx.fillStyle = "#1f2430"; ctx.font = "600 24px " + FONT; ctx.textAlign = "center";
        n[0].split("\n").forEach(function(l, k){ ctx.fillText(l, nx + nw / 2, ny + 50 + k * 30); });
        ctx.textAlign = "left";
      });
    });
    // przeplyw (jak diagram na tablicy)
    for(let i = 0; i < flow.length - 1; i++) arrow(ctx, flow[i][0] + 88, flow[i][1], flow[i + 1][0] - 92, flow[i + 1][1]);
    flow.forEach(function(f, i){
      ctx.fillStyle = i === flow.length - 1 ? "#4262ff" : "#ffffff"; ctx.strokeStyle = "#4262ff"; ctx.lineWidth = 3;
      roundRect(ctx, f[0] - 88, f[1] - 34, 176, 68, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = i === flow.length - 1 ? "#ffffff" : "#1f2430"; ctx.font = "700 24px " + FONT; ctx.textAlign = "center"; ctx.fillText(f[2], f[0], f[1] + 8); ctx.textAlign = "left";
    });
    // pasek narzedzi i zoom (jak w Miro)
    ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#e1e4ea"; roundRect(ctx, 14, 240, 46, 250, 10); ctx.fill(); ctx.stroke();
    ["#4262ff", "#9aa1b0", "#9aa1b0", "#9aa1b0", "#9aa1b0"].forEach(function(c, i){ ctx.fillStyle = c; roundRect(ctx, 25, 254 + i * 46, 24, 24, 6); ctx.fill(); });
    ctx.fillStyle = "#ffffff"; roundRect(ctx, W - 150, H - 60, 130, 42, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#1f2430"; ctx.font = "600 20px " + FONT; ctx.fillText("−  100%  +", W - 134, H - 32);
    // poruszajace sie kursory wspolpracownikow
    cursors.forEach(function(c, i){
      const x = 220 + i * 330 + Math.sin(t * 0.5 + c.p) * 160, y = 330 + Math.cos(t * 0.37 + c.p * 1.3) * 230;
      ctx.fillStyle = c.c; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 30); ctx.lineTo(x + 9, y + 22); ctx.lineTo(x + 21, y + 22); ctx.closePath(); ctx.fill();
      ctx.font = "700 18px " + FONT; const tw = ctx.measureText(c.n).width;
      roundRect(ctx, x + 16, y + 26, tw + 18, 28, 8); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.fillText(c.n, x + 25, y + 46);
    });
    s.tex.needsUpdate = true;
  }
  draw();
  return { tex: s.tex, update: function(dt){ t += dt; acc += dt; if(acc > 1 / 20){ acc = 0; draw(); } } };
}
// ---------- etykiety kartridzy ----------
export function cartridgeLabel(name, c1, c2){
  return canvasTexture(256, 160, function(ctx, w, h){
    ctx.fillStyle = grad(ctx, 0, 0, w, h, [[0, c1], [1, c2]]); ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0, h - 44, w, 44);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "800 26px " + FONT;
    name.split("\n").forEach(function(l, i, arr){ ctx.fillText(l, w / 2, h / 2 - (arr.length - 1) * 15 + i * 30 - 10); });
    ctx.font = "700 14px " + FONT; ctx.fillText("PROJECT CARTRIDGE", w / 2, h - 16);
  }).tex;
}

// ---------- cyfrowa ramka: Wlochy i eventy (zastepcze ilustracje do czasu prawdziwych zdjec) ----------
function sceneRoma(ctx, w, h){
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, "#ffb36b"], [1, "#ff6f61"]]); ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#fff3c4"; ctx.beginPath(); ctx.arc(w * 0.78, h * 0.3, 40, 0, 7); ctx.fill();
  ctx.fillStyle = "#8a4b33"; ctx.fillRect(w * 0.12, h * 0.42, w * 0.76, h * 0.44);
  ctx.fillStyle = "#ffcf9a";
  for(let r = 0; r < 3; r++) for(let c = 0; c < 8; c++){ ctx.beginPath(); ctx.arc(w * 0.17 + c * w * 0.093, h * 0.52 + r * h * 0.12, 12, Math.PI, 0); ctx.fill(); ctx.fillRect(w * 0.17 + c * w * 0.093 - 12, h * 0.52 + r * h * 0.12, 24, 22); }
  return "Roma";
}
function sceneVatican(ctx, w, h){
  ctx.fillStyle = grad(ctx, 0, 0, 0, h, [[0, "#6aa6ff"], [1, "#cfe2ff"]]); ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e8dcc4"; ctx.beginPath(); ctx.arc(w * 0.5, h * 0.52, w * 0.17, Math.PI, 0); ctx.fill();
  ctx.fillRect(w * 0.47, h * 0.24, w * 0.06, h * 0.12); ctx.fillRect(w * 0.18, h * 0.52, w * 0.64, h * 0.3);
  ctx.fillStyle = "#c9bb9f"; for(let i = 0; i < 9; i++) ctx.fillRect(w * 0.21 + i * w * 0.068, h * 0.56, 10, h * 0.24);
  return "Città del Vaticano";
}
function sceneEvent(ctx, w, h){
  ctx.fillStyle = "#120f2a"; ctx.fillRect(0, 0, w, h);
  ["#9b5cff", "#2de2e6", "#ff4fa3"].forEach(function(c, i){ ctx.fillStyle = c; ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(w * (0.2 + i * 0.3), 0); ctx.lineTo(w * (0.05 + i * 0.3), h * 0.7); ctx.lineTo(w * (0.38 + i * 0.3), h * 0.7); ctx.fill(); });
  ctx.globalAlpha = 1; ctx.fillStyle = "#2a2450"; ctx.fillRect(0, h * 0.7, w, h * 0.3);
  ctx.fillStyle = "#0a0816"; for(let i = 0; i < 14; i++){ ctx.beginPath(); ctx.arc(20 + i * (w / 13), h * 0.86, 16, 0, 7); ctx.fill(); }
  return "Eventy · Events";
}
export function photoFrame(){
  const W = 512, H = 384;
  const s = canvasTexture(W, H);
  const scenes = [sceneRoma, sceneVatican, sceneEvent];
  let t = 0, last = -1;
  function draw(i){
    const ctx = s.ctx; const label = scenes[i](ctx, W, H);
    ctx.fillStyle = "rgba(0,0,0,.45)"; ctx.fillRect(0, H - 50, W, 50);
    ctx.fillStyle = "#fff"; ctx.font = "700 24px " + FONT; ctx.fillText(label, 18, H - 17);
    s.tex.needsUpdate = true;
  }
  return { tex: s.tex, update: function(dt){ t += dt; const i = Math.floor(t / 5) % scenes.length; if(i !== last){ last = i; draw(i); } } };
}

// ---------- napis neon ----------
// Neon jak swiecaca rurka: szeroka kolorowa poswiata + kolorowy obrys + jasny rdzen.
// Tekst jest skalowany do szerokosci plotna z marginesem, wiec nic nie jest uciete.
export function neonText(text){
  const s = canvasTexture(2048, 400, function(ctx, w, h){
    ctx.clearRect(0, 0, w, h);
    const parts = text.split(" "), colors = ["#2de2e6", "#c9a6ff", "#ff7ac4"];
    let size = 200, font;
    do { font = "italic 700 " + size + "px 'Segoe UI', 'Trebuchet MS', " + FONT; ctx.font = font; size -= 6; }
    while(ctx.measureText(text).width > w * 0.86 && size > 40);
    ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.lineJoin = "round";
    const space = ctx.measureText(" ").width;
    const widths = parts.map(function(p){ return ctx.measureText(p).width; });
    let x = (w - (widths.reduce(function(a, b){ return a + b; }, 0) + space * (parts.length - 1))) / 2;
    const y = h / 2 + 6;
    parts.forEach(function(p, i){
      const c = colors[i % 3];
      ctx.save();
      ctx.shadowColor = c; ctx.shadowBlur = 38; ctx.strokeStyle = c; ctx.lineWidth = 16; ctx.globalAlpha = 0.55; ctx.strokeText(p, x, y);
      ctx.globalAlpha = 1; ctx.shadowBlur = 16; ctx.lineWidth = 8; ctx.strokeText(p, x, y);
      ctx.shadowBlur = 0; ctx.lineWidth = 3; ctx.strokeStyle = "#ffffff"; ctx.strokeText(p, x, y);
      ctx.restore();
      x += widths[i] + space;
    });
  });
  s.tex.anisotropy = 8;
  return s.tex;
}

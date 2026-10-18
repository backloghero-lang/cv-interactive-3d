import * as THREE from "three";
import { C, mat, glow, rbox, box, cyl, sphere, capsule, group, canvasTexture, screenMesh, roundRect } from "./util.js?v=20261018c";
import * as S from "./screens.js?v=20261018c";

// Uklad pokoju (metry): podloga 6x6 w (0,0,0); sciana tylna z = -3, sciana lewa x = -3.
// Lewa sciana: regal z certyfikatami, biurko z monitorami + neon, sciana ze zdjeciami firm.
// Tylna sciana: okno, tablica umiejetnosci, TV z konsola. Na podlodze: sofa, dywan, barek, miska psa.
export function buildRoom(scene, opts){
  const R = { anim: [], screens: {}, anchors: {}, lights: {}, glowMats: [], dog: {}, seat: null };
  const room = group(scene);

  // ---------- podstawa, podloga, sciany ----------
  // podstawa ponizej podlogi (wspolna plaszczyzna y=0 dawala migoczace czarne pasy)
  rbox(6.5, 0.32, 6.5, mat(C.base), 0.04, -0.1, -0.42, -0.1, room);
  const floorTex = canvasTexture(512, 512, function(ctx, w, h){
    for(let i = 0; i < 8; i++){
      ctx.fillStyle = i % 2 ? "#6e4b36" : "#674632"; ctx.fillRect(0, i * 64, w, 64);
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, i * 64, w, 2);
      for(let k = 0; k < 3; k++){ ctx.fillRect(((i * 137 + k * 211) % w), i * 64, 2, 64); }
    }
  }).tex;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(2, 2);
  const floor = box(6, 0.1, 6, new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.75 }), 0, -0.1, 0, room);
  floor.castShadow = false;

  const wallM = mat(C.wall), wallM2 = mat(C.wallDark);
  // tylna sciana z otworem na okno: x [-2.6,-1.6], y [1.15,2.45]
  box(0.4, 3.2, 0.14, wallM, -2.8, 0, -3.07, room);
  box(4.6, 3.2, 0.14, wallM, 0.7, 0, -3.07, room);
  box(1.0, 1.15, 0.14, wallM, -2.1, 0, -3.07, room);
  box(1.0, 0.75, 0.14, wallM, -2.1, 2.45, -3.07, room);
  // lewa sciana
  box(0.14, 3.2, 6.14, wallM2, -3.07, 0, 0, room);
  // listwy przypodlogowe
  box(6, 0.1, 0.03, mat(C.black), 0, 0, -2.99, room);
  box(0.03, 0.1, 6, mat(C.black), -2.99, 0, 0, room);

  // ---------- okno + niebo (dzien/noc) ----------
  const skyDay = canvasTexture(256, 256, function(ctx, w, h){
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#5fa8ff"); g.addColorStop(1, "#cfe7ff"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(255,255,255,.85)"; [[60, 80, 30], [90, 70, 36], [120, 84, 28], [180, 150, 22], [204, 144, 26]].forEach(function(c){ ctx.beginPath(); ctx.arc(c[0], c[1], c[2], 0, 7); ctx.fill(); });
    ctx.fillStyle = "#4a5a7a"; for(let i = 0; i < 9; i++){ const bh = 40 + (i * 37) % 70; ctx.fillRect(i * 30, h - bh, 26, bh); }
  });
  const skyNight = canvasTexture(256, 256, function(ctx, w, h){
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#070a1f"); g.addColorStop(1, "#28215a"); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for(let i = 0; i < 70; i++){ ctx.fillStyle = "rgba(255,255,255," + (0.3 + Math.random() * 0.7) + ")"; ctx.fillRect(Math.random() * w, Math.random() * h * 0.7, 2, 2); }
    ctx.fillStyle = "#f7f1d0"; ctx.beginPath(); ctx.arc(190, 60, 20, 0, 7); ctx.fill();
    for(let i = 0; i < 9; i++){ const bh = 40 + (i * 37) % 70; ctx.fillStyle = "#151832"; ctx.fillRect(i * 30, h - bh, 26, bh); ctx.fillStyle = "#ffd36b"; for(let k = 0; k < 4; k++) if((i + k) % 3) ctx.fillRect(i * 30 + 5 + (k % 2) * 10, h - bh + 8 + Math.floor(k / 2) * 14, 5, 6); }
  });
  const skyMat = new THREE.MeshBasicMaterial({ map: skyDay.tex });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), skyMat);
  sky.position.set(-2.1, 1.8, -3.25); room.add(sky);
  R.sky = { mat: skyMat, day: skyDay.tex, night: skyNight.tex };
  const frameM = mat(C.white);
  box(1.06, 0.06, 0.2, frameM, -2.1, 1.12, -3.0, room);
  box(1.06, 0.06, 0.2, frameM, -2.1, 2.42, -3.0, room);
  box(0.06, 1.3, 0.2, frameM, -2.6, 1.15, -3.0, room);
  box(0.06, 1.3, 0.2, frameM, -1.6, 1.15, -3.0, room);
  box(0.03, 1.3, 0.05, frameM, -2.1, 1.15, -3.0, room);
  box(1.0, 0.03, 0.05, frameM, -2.1, 1.78, -3.0, room);
  box(1.2, 0.05, 0.26, mat(C.cream), -2.1, 1.08, -2.9, room);   // parapet
  // maly kaktus na parapecie
  cyl(0.06, 0.05, 0.1, mat(C.pot), -1.85, 1.13, -2.88, room);
  rbox(0.07, 0.16, 0.07, mat(C.plant), 0.03, -1.85, 1.22, -2.88, room);

  // ---------- dywan ----------
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), mat(C.rug));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0.9, 0.005, 0.2); rug.receiveShadow = true; room.add(rug);
  const rugRing = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.33, 48), mat(0x6b5fa0));
  rugRing.rotation.x = -Math.PI / 2; rugRing.position.set(0.9, 0.008, 0.2); room.add(rugRing);

  // ---------- biurko (lewa sciana) ----------
  const desk = group(room, -2.55, 0, -0.7);
  rbox(0.9, 0.06, 2.1, mat(C.deskTop), 0.02, 0, 0.72, 0, desk);
  [[-0.38, -0.98], [0.38, -0.98], [-0.38, 0.98], [0.38, 0.98]].forEach(function(p){ rbox(0.06, 0.72, 0.06, mat(C.black), 0.01, p[0], 0, p[1], desk); });
  // LED pod blatem
  const ledM = glow(C.purple, 3); R.glowMats.push(ledM);
  box(0.02, 0.02, 2.0, ledM, 0.44, 0.69, 0, desk);
  // mata pod klawiature (fiolet)
  rbox(0.42, 0.01, 0.95, mat(0x3b2a66), 0.005, 0.15, 0.78, -0.08, desk);
  // klawiatura z podswietleniem
  rbox(0.18, 0.025, 0.46, mat(C.black), 0.01, 0.16, 0.79, -0.02, desk);
  const keysM = glow(C.cyan, 1.4); R.glowMats.push(keysM);
  box(0.15, 0.004, 0.42, keysM, 0.16, 0.815, -0.02, desk);
  // mysz
  R.mouse = rbox(0.08, 0.03, 0.05, mat(C.black), 0.015, 0.18, 0.79, -0.43, desk);

  // monitor glowny
  const mainScr = S.mainMonitor();
  const mon = group(desk, -0.22, 0, -0.1);
  rbox(0.18, 0.02, 0.26, mat(C.black), 0.01, 0, 0.78, 0, mon);
  rbox(0.04, 0.35, 0.05, mat(C.black), 0.01, 0, 0.78, 0, mon);
  rbox(0.05, 0.6, 1.0, mat(C.black), 0.02, 0.01, 0.95, 0, mon);
  const mainMesh = screenMesh(0.94, 0.56, mainScr.tex, true);
  mainMesh.rotation.y = Math.PI / 2; mainMesh.position.set(0.04, 1.25, 0); mon.add(mainMesh);
  R.screens.main = mainScr;
  // monitor boczny pionowy, skrecony w strone postaci
  const sideScr = S.sideMonitor();
  const mon2 = group(desk, -0.12, 0, 0.72);
  mon2.rotation.y = 0.55;
  rbox(0.16, 0.02, 0.2, mat(C.black), 0.01, 0, 0.78, 0, mon2);
  rbox(0.04, 0.2, 0.05, mat(C.black), 0.01, 0, 0.78, 0, mon2);
  rbox(0.05, 0.86, 0.52, mat(C.black), 0.02, 0.01, 0.9, 0, mon2);
  const sideMesh = screenMesh(0.48, 0.79, sideScr.tex, true);
  sideMesh.rotation.y = Math.PI / 2; sideMesh.position.set(0.04, 1.33, 0); mon2.add(sideMesh);
  R.screens.side = sideScr;
  // podswietlenie za monitorami
  const backM = glow(C.cyan, 2.4); R.glowMats.push(backM);
  box(0.02, 0.5, 0.02, backM, -0.43, 0.98, -0.62, desk);
  box(0.02, 0.5, 0.02, backM, -0.43, 0.98, 0.42, desk);
  // lampka
  const lamp = group(desk, -0.3, 0.75, 0.92);
  cyl(0.08, 0.09, 0.03, mat(C.black), 0, 0, 0, lamp);
  const arm = rbox(0.025, 0.45, 0.025, mat(C.black), 0.01, 0, 0.02, 0, lamp); arm.rotation.z = -0.35; arm.position.x = 0.07;
  const shade = cyl(0.04, 0.1, 0.12, mat(C.black), 0.18, 0.42, 0, lamp); shade.rotation.z = 0.9;
  const bulbM = glow(C.warm, 3.2); R.glowMats.push(bulbM);
  sphere(0.035, bulbM, 0.23, 0.44, 0, lamp);
  // kubek z para
  const mug = group(desk, 0.18, 0.75, 0.55);
  cyl(0.045, 0.04, 0.1, mat(C.purple), 0, 0, 0, mug);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 14), mat(C.purple)); handle.position.set(0, 0.05, 0.05); handle.rotation.y = Math.PI / 2; mug.add(handle);
  const steamM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const steam = [];
  for(let i = 0; i < 4; i++){ const p = sphere(0.018, steamM.clone(), 0, 0.12, 0, mug, 8); p.castShadow = false; steam.push(p); }
  R.anim.push(function(dt, t){
    steam.forEach(function(p, i){ const k = (t * 0.5 + i / steam.length) % 1; p.position.set(Math.sin(k * 6 + i) * 0.015, 0.11 + k * 0.22, 0); p.scale.setScalar(0.6 + k * 1.4); p.material.opacity = 0.4 * (1 - k); });
  });
  // sluchawki na stojaku
  const hp = group(desk, 0.05, 0.75, 0.95);
  cyl(0.05, 0.06, 0.02, mat(C.black), 0, 0, 0, hp);
  cyl(0.012, 0.012, 0.28, mat(C.metal), 0, 0.02, 0, hp);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.014, 8, 20, Math.PI), mat(C.black)); band.position.set(0, 0.3, 0); band.rotation.y = Math.PI / 2; hp.add(band);
  rbox(0.05, 0.08, 0.05, mat(C.purple), 0.02, 0, 0.2, -0.08, hp); rbox(0.05, 0.08, 0.05, mat(C.purple), 0.02, 0, 0.2, 0.08, hp);
  // PC z wentylatorami RGB pod biurkiem
  const pc = group(room, -2.6, 0, -1.55);
  rbox(0.42, 0.48, 0.22, mat(C.black), 0.02, 0, 0, 0, pc);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.4), new THREE.MeshStandardMaterial({ color: 0x223, transparent: true, opacity: 0.55, roughness: 0.1 }));
  glass.position.set(0.0, 0.25, 0.115); pc.add(glass);
  const fans = [];
  [0.12, 0.3].forEach(function(y, i){
    const fm = glow(i ? C.cyan : C.purple, 2.6); R.glowMats.push(fm);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 24), fm); ring.position.set(0.05, y + 0.02, 0.1); pc.add(ring);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.015, 0.005), mat(0x333344)); blade.position.copy(ring.position); pc.add(blade); fans.push(blade);
  });
  R.anim.push(function(dt){ fans.forEach(function(f){ f.rotation.z += dt * 9; }); });

  // ---------- fotel gamingowy (miekki, oble ksztalty) ----------
  const chair = group(room, -1.95, 0, -0.72);
  chair.rotation.y = Math.PI / 2;     // oparcie (lokalne +z) za plecami postaci, od strony +x; postac patrzy w -x
  cyl(0.035, 0.045, 0.36, mat(C.metal, { metalness: 0.6, roughness: 0.35 }), 0, 0.07, 0, chair);
  for(let i = 0; i < 5; i++){
    const a = i * 1.2566, leg = capsule(0.022, 0.24, mat(C.black), Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.14, chair, false);
    leg.rotation.set(Math.PI / 2, 0, 0); leg.rotation.y = a; leg.rotation.order = "YXZ";
    sphere(0.03, mat(0x33343f), Math.sin(a) * 0.27, 0.03, Math.cos(a) * 0.27, chair, 16);
  }
  rbox(0.54, 0.12, 0.52, mat(C.black), 0.05, 0, 0.42, 0, chair);
  const backG = group(chair, 0, 0.5, 0.25); backG.rotation.x = -0.14;
  rbox(0.52, 0.82, 0.13, mat(C.black), 0.055, 0, 0, 0, backG);
  // boczne "skrzydla" oparcia i poduszka pod glowe
  rbox(0.1, 0.62, 0.16, mat(C.black), 0.045, -0.25, 0.06, -0.02, backG).rotation.z = 0.08;
  rbox(0.1, 0.62, 0.16, mat(C.black), 0.045, 0.25, 0.06, -0.02, backG).rotation.z = -0.08;
  rbox(0.3, 0.12, 0.08, mat(C.purple), 0.05, 0, 0.66, -0.08, backG);
  const stripeM = mat(C.purple, { emissive: C.purple, emissiveIntensity: 0.35 });
  rbox(0.07, 0.6, 0.02, stripeM, 0.01, -0.13, 0.1, -0.07, backG);
  rbox(0.07, 0.6, 0.02, stripeM, 0.01, 0.13, 0.1, -0.07, backG);
  [-0.3, 0.3].forEach(function(x){ capsule(0.035, 0.26, mat(C.black), x, 0.69, -0.02, chair, false).rotation.x = Math.PI / 2; cyl(0.018, 0.018, 0.2, mat(C.black), x, 0.48, 0.02, chair); });
  R.seat = { x: -1.95, y: 0.54, z: -0.72 };

  // ---------- neon nad biurkiem ----------
  const neonTex = S.neonText("Analyze. Design. Ship.");
  const neonMat = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, depthWrite: false });
  neonMat.color.setRGB(1.6, 1.6, 1.6);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.41), neonMat);
  neon.rotation.y = Math.PI / 2; neon.position.set(-2.98, 2.45, -0.7); room.add(neon);
  R.neon = neonMat;

  // ---------- regal z certyfikatami (lewa sciana, rog) ----------
  const shelf = group(room, -2.8, 0, -2.45);
  // regal w stylu cyberpunk: grafitowy metal, neonowe listwy LED pod kazda polka
  const metalM = mat(0x1b1d2b, { metalness: 0.6, roughness: 0.35 });
  [0, 0.55, 1.1, 1.65, 2.15].forEach(function(y, i){
    rbox(0.36, 0.04, 0.86, metalM, 0.01, 0, y, 0, shelf);
    const lm = glow(i % 2 ? C.pink : C.cyan, 2.6); R.glowMats.push(lm);
    box(0.012, 0.012, 0.8, lm, 0.17, y - 0.012, 0, shelf);
  });
  rbox(0.36, 2.2, 0.04, metalM, 0.01, 0, 0, -0.43, shelf);
  rbox(0.36, 2.2, 0.04, metalM, 0.01, 0, 0, 0.43, shelf);
  [-0.43, 0.43].forEach(function(z){ const sm = glow(C.purple, 2.2); R.glowMats.push(sm); box(0.012, 2.18, 0.012, sm, 0.18, 0.01, z, shelf); });
  // ksiazki (ciemne grzbiety z kolorowymi paskami) i maly hologram
  for(let i = 0; i < 11; i++){
    const h = 0.32 + (i * 7 % 5) * 0.03, z = -0.36 + i * 0.065;
    rbox(0.24, h, 0.055, mat(i % 3 ? 0x23263a : 0x2e1f48), 0.008, 0, 0.04, z, shelf);
    const bm = glow([C.cyan, C.purple, C.pink][i % 3], 1.4); R.glowMats.push(bm);
    box(0.004, 0.02, 0.05, bm, 0.121, 0.04 + h * 0.7, z, shelf);
  }
  // certyfikaty: holograficzne panele w scietych ramkach z neonowa krawedzia
  const certAccents = ["#9b5cff", "#2de2e6", "#ff4fa3", "#3fe08a", "#ffb000"];
  const certs = [["AI Academy", "2026"], ["UML: Modelowanie Systemów", "2025"], ["T-SQL: MS SQL Server", "2024"], ["BPMN: Modelowanie Procesów", "2023"], ["Inżynieria Wymagań", "2023"]];
  const certPos = [[0.59, -0.2], [0.59, 0.2], [1.14, -0.2], [1.14, 0.2], [1.69, 0]];
  certs.forEach(function(c, i){
    const p = certPos[i], g = group(shelf, 0.02, p[0], p[1]);
    g.rotation.z = 0.12;
    rbox(0.03, 0.32, 0.38, mat(0x0d0f1c, { metalness: 0.5, roughness: 0.4 }), 0.006, 0, 0, 0, g);
    const em = glow(new THREE.Color(certAccents[i]).getHex(), 2.4); R.glowMats.push(em);
    [[0.012, 0.3], [0.31, 0.3]].forEach(function(q){ box(0.006, 0.008, q[1], em, 0.017, q[0], 0, g); });
    const m = screenMesh(0.33, 0.24, S.certificate(c[0], c[1], certAccents[i]), true);
    m.rotation.y = Math.PI / 2; m.position.set(0.018, 0.16, 0); g.add(m);
  });
  // kostka hologramu z obracajacym sie logo "AI"
  cyl(0.07, 0.08, 0.03, metalM, 0.0, 1.69, 0.32, shelf);
  const holoM = new THREE.MeshBasicMaterial({ color: 0x2de2e6, transparent: true, opacity: 0.35, wireframe: true });
  const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), holoM); holo.position.set(0, 1.84, 0.32); shelf.add(holo);
  const holoCore = sphere(0.03, glow(C.purple, 3), 0, 1.84, 0.32, shelf, 16); holoCore.castShadow = false;
  R.anim.push(function(dt, t){ holo.rotation.y += dt * 0.9; holo.rotation.x = Math.sin(t) * 0.3; holo.position.y = 1.84 + Math.sin(t * 1.6) * 0.015; });
  R.anchors.shelf = new THREE.Vector3(-2.75, 2.55, -2.45);

  // ---------- tablica umiejetnosci w stylu Miro (biala tablica w cienkiej ramie) ----------
  const board = group(room, -0.5, 0, -2.98);
  rbox(1.66, 1.06, 0.04, mat(0xd8dbe4, { metalness: 0.4, roughness: 0.4 }), 0.012, 0, 1.24, 0, board);
  const boardScr = S.skillsBoard();
  const boardMesh = screenMesh(1.6, 0.995, boardScr.tex, true);
  boardMesh.material.emissiveIntensity = 0.35;
  boardMesh.position.set(0, 1.77, 0.022); board.add(boardMesh);
  rbox(1.2, 0.04, 0.08, mat(0xd8dbe4), 0.01, 0, 1.2, 0.04, board);   // polka na markery
  [[-0.4, 0x4262ff], [-0.3, 0xff4f8b], [-0.2, 0x00b37e]].forEach(function(m){ capsule(0.012, 0.1, mat(m[1]), m[0], 1.255, 0.05, board, true); });
  R.screens.board = boardScr;
  R.anchors.board = new THREE.Vector3(-0.5, 2.55, -2.85);
  // ---------- TV + konsola z projektami ----------
  const tvScr = S.tvScreen(opts.getLang);
  const tv = group(room, 1.8, 0, -2.96);
  rbox(1.9, 1.1, 0.06, mat(C.black), 0.03, 0, 1.12, 0, tv);
  const tvMesh = screenMesh(1.8, 1.0, tvScr.tex, true);
  tvMesh.position.set(0, 1.67, 0.035); tv.add(tvMesh);
  R.screens.tv = tvScr;
  const tvLedM = glow(C.cyan, 2.2); R.glowMats.push(tvLedM);
  box(1.86, 0.02, 0.02, tvLedM, 0, 1.08, -0.02, tv);
  // szafka RTV
  const media = group(room, 1.8, 0, -2.72);
  rbox(2.0, 0.42, 0.42, mat(C.wood), 0.03, 0, 0.06, 0, media);
  [-0.5, 0.5].forEach(function(x){ rbox(0.9, 0.3, 0.02, mat(C.woodDark), 0.01, x, 0.12, 0.21, media); });
  [-0.85, 0.85].forEach(function(x){ cyl(0.025, 0.02, 0.06, mat(C.black), x, 0, 0, media); });
  rbox(0.9, 0.07, 0.1, mat(C.black), 0.03, 0.3, 0.48, -0.05, media);   // soundbar
  // konsola
  const con = group(media, -0.55, 0.48, 0.02);
  rbox(0.42, 0.08, 0.28, mat(C.white), 0.02, 0, 0, 0, con);
  const conLed = glow(C.cyan, 2.5); R.glowMats.push(conLed);
  box(0.36, 0.008, 0.01, conLed, 0, 0.035, 0.14, con);
  // kartridze z projektami
  const carts = [["BOURBON\nHUNTERS", "#c98a3a", "#5a2a14"], ["POKERHOUSE\nTRAINER", "#1e7a4c", "#0b2e1d"], ["PRICE\nSHIFT", "#6a4bd8", "#22165a"]];
  // stojak z trzema kartridzami (projekty) przed konsola
  rbox(0.66, 0.03, 0.14, mat(C.black), 0.01, -0.02, 0.48, 0.1, media);
  carts.forEach(function(c, i){
    const g = group(media, -0.24 + i * 0.22, 0.51, 0.1);
    g.rotation.set(-0.12, -0.12 + i * 0.12, 0);
    rbox(0.19, 0.26, 0.04, mat(0x2a2a35), 0.01, 0, 0, 0, g);
    const lab = screenMesh(0.165, 0.103, S.cartridgeLabel(c[0], c[1], c[2]), false);
    lab.position.set(0, 0.15, 0.021); g.add(lab);
    const gm = glow([0xc98a3a, 0x2fbf71, 0x8b6bff][i], 2); R.glowMats.push(gm);
    box(0.17, 0.012, 0.012, gm, 0, 0.012, 0.022, g);
  });
  R.anchors.console = new THREE.Vector3(1.6, 1.05, -2.6);

  // ---------- sciana zdjec firm (lewa sciana, przod) ----------
  const photos = [["comarch", "Comarch", "2022 –", ["#123a6b", "#0a1f3d"]], ["aldi", "ALDI", "2021–22", ["#1d3d8f", "#0f2459"]],
                  ["specjal", "SPECJAŁ", "2019–21", ["#5a1f1a", "#2e0e0b"]], ["komfort", "Komfort", "2019", ["#3b2a73", "#1d1440"]], ["auchan", "Auchan", "2016–18", ["#174d31", "#0a2a1a"]]];
  // [wysokosc srodka, z, szerokosc]: Comarch duzy w srodku gornego rzedu
  const photoPos = [[2.05, 1.5, 0.5], [2.05, 0.95, 0.4], [2.05, 2.05, 0.4], [1.38, 1.22, 0.4], [1.38, 1.78, 0.4]];
  photos.forEach(function(p, i){
    const pp = photoPos[i], w = pp[2], h = w * 1.25;
    const g = group(room, -2.98, pp[0], pp[1]);
    g.rotation.y = Math.PI / 2;
    rbox(w + 0.06, h + 0.06, 0.04, mat(i === 0 ? C.white : C.black), 0.01, 0, -(h + 0.06) / 2, 0, g);
    const m = screenMesh(w, h, S.companyPhoto(p[0], p[1], p[2]), false);
    m.position.set(0, 0, 0.022); g.add(m);
  });
  // lampki choinkowe nad zdjeciami
  const bulbs = [];
  for(let i = 0; i < 14; i++){
    const z = 0.55 + i * 0.13, y = 2.8 - Math.sin(i / 13 * Math.PI) * 0.12;
    const bm = glow([C.purple, C.cyan, C.pink, C.warm][i % 4], 2.4); R.glowMats.push(bm);
    bulbs.push(sphere(0.022, bm, -2.97, y, z, room, 8));
  }
  R.anim.push(function(dt, t){ bulbs.forEach(function(b, i){ b.material.emissiveIntensity = 1.4 + 1.6 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3)); }); });
  R.anchors.wall = new THREE.Vector3(-2.85, 2.6, 1.65);

  // ---------- sofa ----------
  // sofa z miekkimi, pufiastymi poduchami
  const sofa = group(room, 1.4, 0, 1.05);
  rbox(1.92, 0.22, 0.86, mat(C.sofaDark), 0.06, 0, 0.07, 0, sofa);
  [-0.42, 0.42].forEach(function(x){
    rbox(0.82, 0.17, 0.62, mat(C.sofa), 0.07, x, 0.27, -0.06, sofa);                 // siedziska
    rbox(0.82, 0.44, 0.22, mat(C.sofa), 0.09, x, 0.3, 0.3, sofa).rotation.x = 0.14;  // oparcia
  });
  [-0.87, 0.87].forEach(function(x){ rbox(0.2, 0.42, 0.86, mat(C.sofaDark), 0.085, x, 0.07, 0, sofa); });  // podlokietniki
  [[-0.8, -0.34], [0.8, -0.34], [-0.8, 0.34], [0.8, 0.34]].forEach(function(p){ cyl(0.028, 0.02, 0.07, mat(C.woodDark), p[0], 0, p[1], sofa); });
  rbox(0.36, 0.32, 0.13, mat(C.purple), 0.07, -0.55, 0.42, 0.18, sofa).rotation.set(-0.2, 0, 0.18);
  rbox(0.34, 0.3, 0.13, mat(C.cyan), 0.07, 0.6, 0.42, 0.18, sofa).rotation.set(-0.2, 0, -0.14);
  // kocyk psa na sofie
  rbox(0.66, 0.03, 0.5, mat(0xd9c3a5), 0.015, 0.12, 0.44, -0.08, sofa);
  R.dog.sofa = new THREE.Vector3(1.52, 0.47, 0.97);

  // stolik kawowy z padem i glosnikiem (jak w salonie gracza)
  const table = group(room, 1.3, 0, -0.55);
  rbox(1.0, 0.07, 0.56, mat(C.cream), 0.03, 0, 0.36, 0, table);
  rbox(0.92, 0.2, 0.48, mat(C.wood), 0.04, 0, 0.12, 0, table);
  rbox(0.92, 0.04, 0.48, mat(C.cream), 0.02, 0, 0.06, 0, table);
  [[-0.43, -0.22], [0.43, -0.22], [-0.43, 0.22], [0.43, 0.22]].forEach(function(p){ cyl(0.022, 0.022, 0.06, mat(C.black), p[0], 0, p[1], table); });
  const pad = group(table, 0.15, 0.43, 0.05); pad.rotation.y = 0.4;
  rbox(0.2, 0.04, 0.11, mat(C.black), 0.02, 0, 0, 0, pad);
  [-0.085, 0.085].forEach(function(x){ capsule(0.032, 0.03, mat(C.black), x, 0.01, 0.05, pad, false).rotation.x = Math.PI / 2; });
  sphere(0.016, glow(C.purple, 2), -0.05, 0.045, 0, pad, 12); sphere(0.016, glow(C.cyan, 2), 0.05, 0.045, 0, pad, 12);
  cyl(0.05, 0.055, 0.09, mat(0x3a3e58), -0.3, 0.43, -0.08, table);
  sphere(0.045, mat(0x3a3e58), -0.3, 0.52, -0.08, table, 20);
  const spkM = glow(C.cyan, 1.6); R.glowMats.push(spkM);
  const spkRing = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.006, 8, 32), spkM); spkRing.rotation.x = Math.PI / 2; spkRing.position.set(-0.3, 0.435, -0.08); table.add(spkRing);

  // ---------- barek + cyfrowa ramka (hobby) ----------
  const cart = group(room, 2.6, 0, -1.45);
  [0.08, 0.55].forEach(function(y){ rbox(0.5, 0.03, 0.42, mat(C.woodDark), 0.01, 0, y, 0, cart); });
  [[-0.23, -0.19], [0.23, -0.19], [-0.23, 0.19], [0.23, 0.19]].forEach(function(p){ cyl(0.012, 0.012, 0.6, mat(0xc9a050, { metalness: 0.6, roughness: 0.35 }), p[0], 0, p[1], cart, 8); });
  const bottleCols = [0x8a4b1d, 0x5a2a14, 0xa8682a, 0x3f6b3a];
  bottleCols.forEach(function(col, i){
    const bx = -0.17 + i * 0.11, bz = i % 2 ? 0.06 : -0.06;
    cyl(0.04, 0.04, 0.22, mat(col, { roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.92 }), bx, 0.58, bz, cart, 12);
    cyl(0.014, 0.03, 0.06, mat(col), bx, 0.8, bz, cart, 10);
    cyl(0.015, 0.015, 0.03, mat(C.black), bx, 0.86, bz, cart, 8);
  });
  for(let i = 0; i < 3; i++) cyl(0.035, 0.03, 0.07, mat(0xffffff, { transparent: true, opacity: 0.45, roughness: 0.05 }), -0.15 + i * 0.12, 0.11, 0.05, cart, 12);
  const frameScr = S.photoFrame();
  const pf = group(cart, 0.02, 0.58, -0.12);
  pf.rotation.y = -0.6;
  rbox(0.46, 0.36, 0.035, mat(C.black), 0.015, 0, 0.42, 0, pf);
  rbox(0.04, 0.42, 0.04, mat(C.black), 0.01, 0, 0, -0.04, pf).rotation.x = -0.3;
  const pfm = screenMesh(0.42, 0.31, frameScr.tex, true);
  pfm.position.set(0, 0.6, 0.02); pf.add(pfm);
  R.screens.frame = frameScr;
  R.anchors.hobby = new THREE.Vector3(2.6, 1.55, -1.45);

  // ---------- miska psa: pod kwiatkiem przy tylnej scianie ----------
  const bowl = group(room, -0.02, 0, -2.66);
  rbox(0.5, 0.012, 0.3, mat(0xd9cfc1), 0.005, 0.06, 0, 0.02, bowl);
  const bowlM = mat(0xe85d4a);
  const bowlMesh = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 16, 40), bowlM);
  bowlMesh.rotation.x = Math.PI / 2; bowlMesh.position.set(-0.05, 0.045, 0); bowlMesh.castShadow = true; bowl.add(bowlMesh);
  cyl(0.1, 0.09, 0.03, bowlM, -0.05, 0.012, 0, bowl);
  cyl(0.085, 0.085, 0.01, mat(0x7a4a2a), -0.05, 0.04, 0, bowl);
  // druga miseczka z woda
  const bowl2 = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.026, 14, 32), mat(0x3f86c6)); bowl2.rotation.x = Math.PI / 2; bowl2.position.set(0.17, 0.034, 0.02); bowl2.castShadow = true; bowl.add(bowl2);
  cyl(0.06, 0.06, 0.008, mat(0x9fd8ff, { roughness: 0.1 }), 0.17, 0.03, 0.02, bowl);
  R.dog.bowl = new THREE.Vector3(-0.07, 0, -2.66);
  R.dog.owner = new THREE.Vector3(-1.5, 0, -0.2);

  // ---------- rosliny ----------
  function monstera(parent, x, z, s){
    const p = group(parent, x, 0, z); p.scale.setScalar(s);
    cyl(0.17, 0.13, 0.36, mat(C.pot), 0, 0, 0, p);
    cyl(0.15, 0.15, 0.02, mat(0x4a3324), 0, 0.35, 0, p);
    const leafM = mat(C.plant, { side: THREE.DoubleSide }), leafM2 = mat(C.plantDark, { side: THREE.DoubleSide });
    const leaves = [];
    for(let i = 0; i < 9; i++){
      const a = i * 2.4, h = 0.55 + (i % 4) * 0.15;
      cyl(0.008, 0.008, h, mat(0x2f6b3a), Math.cos(a) * 0.04, 0.36, Math.sin(a) * 0.04, p, 6).rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35);
      const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.16 + (i % 3) * 0.03, 10), i % 2 ? leafM : leafM2);
      leaf.position.set(Math.cos(a) * (0.12 + h * 0.3), 0.36 + h, Math.sin(a) * (0.12 + h * 0.3));
      leaf.rotation.set(-Math.PI / 2 + 0.6, a, 0); leaf.castShadow = true; p.add(leaf); leaves.push(leaf);
    }
    R.anim.push(function(dt, t){ leaves.forEach(function(l, i){ l.rotation.z = Math.sin(t * 0.8 + i) * 0.05; }); });
  }
  monstera(room, -2.55, 2.55, 1.1);
  monstera(room, 0.56, -2.62, 0.85);   // pod nia miska psa
  // wiszaca roslina na polce nad TV
  rbox(0.9, 0.04, 0.2, mat(C.woodDark), 0.01, 1.8, 2.42, -2.9, room);
  cyl(0.09, 0.07, 0.14, mat(C.pot), 1.45, 2.46, -2.88, room);
  for(let i = 0; i < 6; i++) rbox(0.05, 0.08, 0.04, mat(i % 2 ? C.plant : C.plantDark), 0.02, 1.38 + (i % 3) * 0.05, 2.38 - i * 0.07, -2.84 + (i % 2) * 0.03, room);
  rbox(0.1, 0.14, 0.08, mat(0xf2c14e), 0.02, 2.0, 2.46, -2.9, room);   // figurka
  rbox(0.08, 0.1, 0.08, mat(C.purple), 0.02, 2.25, 2.46, -2.9, room);

  // ---------- swiatla ----------
  const hemi = new THREE.HemisphereLight(0xbfc8ff, 0x3a2a22, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.2);
  sun.position.set(-4.5, 7, -6.5); sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(opts.lowPower ? 1024 : 2048, opts.lowPower ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 20 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xc8d0ff, 0.6); fill.position.set(6, 5, 6); scene.add(fill);
  const lampLight = new THREE.PointLight(C.warm, 1.2, 4, 1.6); lampLight.position.set(-2.5, 1.25, 0.3); scene.add(lampLight);
  const neonLight = new THREE.PointLight(C.purple, 1.4, 4.5, 1.6); neonLight.position.set(-2.6, 2.3, -0.7); scene.add(neonLight);
  const tvLight = new THREE.PointLight(C.cyan, 1.0, 4, 1.6); tvLight.position.set(1.8, 1.6, -2.4); scene.add(tvLight);
  R.lights = { hemi: hemi, sun: sun, fill: fill, lamp: lampLight, neon: neonLight, tv: tvLight };

  R.update = function(dt, t, typing){
    R.anim.forEach(function(f){ f(dt, t); });
    R.screens.main.update(dt, typing);
    R.screens.side.update(dt);
    R.screens.tv.update(dt);
    R.screens.frame.update(dt);
    R.screens.board.update(dt);
  };
  R.anchors.desk = new THREE.Vector3(-2.6, 1.95, -0.7);
  return R;
}

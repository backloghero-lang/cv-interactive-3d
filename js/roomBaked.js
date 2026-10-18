import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { C, mat, glow, box, sphere, group, canvasTexture } from "./util.js?v=20261018b";
import * as S from "./screens.js?v=20261018b";

// Pokoj z Blendera: statyczna geometria z wypalonym oswietleniem (noc / dzien) + elementy dynamiczne dokladane tutaj
// (ekrany, neon, LED-y, lampki, hologram). Interfejs zwracanego obiektu jest taki sam jak w room.js.
const BASE = "assets/room/"; const V = "?v=20261018b";   // znacznik wersji: wymusza swieze pliki po publikacji

export function load(url, onProgress){
  const draco = new DRACOLoader(); draco.setDecoderPath("vendor/addons/libs/draco/gltf/");
  const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
  return new Promise(function(res, rej){ loader.load(url, res, onProgress, rej); });
}
function tex(url){
  return new Promise(function(res, rej){
    new THREE.TextureLoader().load(url, function(t){ t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 8; res(t); }, undefined, rej);
  });
}

// material z dwoma wypalonymi teksturami (noc/dzien) i plynnym przejsciem; bez oswietlenia czasu rzeczywistego
function bakedMaterial(night, day){
  return new THREE.ShaderMaterial({
    uniforms: { mapA: { value: day }, mapB: { value: night }, mixK: { value: 0 }, gain: { value: 0.9 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform sampler2D mapA; uniform sampler2D mapB; uniform float mixK; uniform float gain; varying vec2 vUv;" +
      "void main(){ vec3 a = texture2D(mapA, vUv).rgb; vec3 b = texture2D(mapB, vUv).rgb; gl_FragColor = vec4(mix(a, b, mixK) * gain, 1.0); }"
  });
}

export async function buildBakedRoom(scene, opts){
  const R = { anim: [], screens: {}, anchors: {}, lights: {}, glowMats: [], dog: {}, seat: { x: -1.95, y: 0.54, z: -0.72 }, baked: true };
  const progress = opts.onProgress || function(){};
  const [gltf, props, lampOn, lampOff] = await Promise.all([
    load(BASE + "room.glb" + V, function(e){ if(e.total) progress(e.loaded / e.total); }),
    load(BASE + "props.glb" + V).catch(function(){ return null; }),
    tex(BASE + "bake_on.jpg" + V), tex(BASE + "bake_off.jpg" + V)
  ]);
  const room = gltf.scene; scene.add(room);
  const named = {};
  room.traverse(function(o){ if(o.isMesh) named[o.name] = o; });

  // ---------- statyczny pokoj z wypalonym swiatlem ----------
  const baked = named.ROOM_BAKED;
  R.bakedMat = bakedMaterial(lampOn, lampOff);   // (mapB, mapA): mixK 1 = lampa wlaczona, 0 = zgaszona
  if(baked) baked.material = R.bakedMat;

  // ---------- plaszczyzny dynamiczne ----------
  // UV z glTF maja poczatek u gory (jak flipY=false), wiec tekstury z canvasu nie moga byc odwracane
  function basic(t, k){ t.flipY = false; t.needsUpdate = true; const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: true }); if(k) m.color.setScalar(k); return m; }
  function setMat(name, m){ if(named[name]) named[name].material = m; }
  R.screens.main = S.mainMonitor(); setMat("SCREEN_main", basic(R.screens.main.tex, 0.9));
  R.screens.side = S.sideMonitor(); setMat("SCREEN_side", basic(R.screens.side.tex, 0.9));
  R.screens.tv = S.tvScreen(opts.getLang); setMat("SCREEN_tv", basic(R.screens.tv.tex, 0.95));
  R.screens.board = S.skillsBoard(); setMat("BOARD", basic(R.screens.board.tex, 0.62));
  const certs = [["AI Academy", "2026"], ["UML: Modelowanie Systemów", "2025"], ["T-SQL: MS SQL Server", "2024"], ["BPMN: Modelowanie Procesów", "2023"], ["Inżynieria Wymagań", "2023"]];
  const certAccents = ["#9b5cff", "#2de2e6", "#ff4fa3", "#3fe08a", "#ffb000"];
  certs.forEach(function(c, i){ setMat("CERT_" + i, basic(S.certificate(c[0], c[1], certAccents[i]), 0.95)); });
  [["comarch", "Comarch", "2022 –"], ["aldi", "ALDI", "2021–22"], ["specjal", "SPECJAŁ", "2019–21"], ["komfort", "Komfort", "2019"], ["auchan", "Auchan", "2016–18"]]
    .forEach(function(p, i){ setMat("PHOTO_" + i, basic(S.companyPhoto(p[0], p[1], p[2]), 0.6)); });
  [["BOURBON\nHUNTERS", "#c98a3a", "#5a2a14"], ["POKERHOUSE\nTRAINER", "#1e7a4c", "#0b2e1d"], ["PRICE\nSHIFT", "#6a4bd8", "#22165a"]]
    .forEach(function(c, i){ setMat("CART_" + i, basic(S.cartridgeLabel(c[0], c[1], c[2]), 0.8)); });
  // neon: przezroczysta tekstura z jasnoscia ponad 1 (lapie bloom)
  const neonTex = S.neonText("Analyze. Design. Ship."); neonTex.flipY = false;
  R.neon = new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, depthWrite: false });
  R.neon.color.setScalar(1.6); setMat("NEON", R.neon);
  // niebo za oknem (dzien/noc)
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
  skyDay.tex.flipY = false; skyNight.tex.flipY = false;
  const skyMat = new THREE.MeshBasicMaterial({ map: skyNight.tex });   // za oknem zawsze noc
  setMat("SKY", skyMat);
  R.sky = { mat: skyMat, day: skyDay.tex, night: skyNight.tex };

  // ---------- rosliny i lampka (wlasne materialy, oswietlane w czasie rzeczywistym) ----------
  if(props){
    props.scene.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; if(o.material){ o.material.roughness = 0.8; o.material.side = THREE.DoubleSide; } } });
    scene.add(props.scene);
    R.anim.push(function(dt, t){ props.scene.children.forEach(function(c, i){ if(/plant/i.test(c.name)) c.rotation.z = Math.sin(t * 0.7 + i) * 0.006; }); });
  }

  // ---------- swiecace elementy (bloom) ----------
  const fx = group(scene);
  function strip(color, k, w, h, d, x, y, z){ const m = glow(color, k); R.glowMats.push(m); const b = box(w, h, d, m, x, y, z, fx); b.castShadow = false; return b; }
  strip(C.purple, 3, 0.02, 0.02, 2.0, -2.11, 0.69, -0.7);                 // LED pod blatem biurka
  strip(C.cyan, 2.4, 0.02, 0.5, 0.02, -2.98, 0.98, -1.32);                 // poswiata za monitorem
  strip(C.cyan, 2.4, 0.02, 0.5, 0.02, -2.98, 0.98, -0.28);
  strip(C.cyan, 1.4, 0.15, 0.004, 0.42, -2.39, 0.815, -0.72);              // klawiatura RGB
  strip(C.cyan, 2.2, 1.86, 0.02, 0.02, 1.8, 1.08, -2.9);                   // listwa LED pod TV
  strip(C.cyan, 2.5, 0.36, 0.008, 0.01, 1.25, 0.555, -2.555);              // konsola
  [0, 0.55, 1.1, 1.65, 2.15].forEach(function(y, i){ strip(i % 2 ? C.pink : C.cyan, 2.6, 0.012, 0.012, 0.8, -2.63, y - 0.012, -2.45); });
  [-2.88, -2.02].forEach(function(z){ strip(C.purple, 2.2, 0.012, 2.18, 0.012, -2.62, 0.01, z); });
  // neonowe krawedzie certyfikatow
  [[0.59, -0.2], [0.59, 0.2], [1.14, -0.2], [1.14, 0.2], [1.69, 0]].forEach(function(p, i){
    const col = new THREE.Color(certAccents[i]).getHex();
    strip(col, 2.4, 0.006, 0.008, 0.3, -2.75, p[0] + 0.015, -2.45 + p[1]);
    strip(col, 2.4, 0.006, 0.008, 0.3, -2.75, p[0] + 0.31, -2.45 + p[1]);
  });
  // wentylatory RGB w PC
  const fans = [];
  [0.12, 0.3].forEach(function(y, i){
    const fm = glow(i ? C.cyan : C.purple, 2.6); R.glowMats.push(fm);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 24), fm); ring.position.set(-2.55, y + 0.02, -1.435); fx.add(ring);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.015, 0.005), mat(0x333344)); blade.position.copy(ring.position); fx.add(blade); fans.push(blade);
  });
  R.anim.push(function(dt){ fans.forEach(function(f){ f.rotation.z += dt * 9; }); });
  // lampki nad zdjeciami
  const bulbs = [];
  for(let i = 0; i < 14; i++){
    const z = 0.55 + i * 0.13, y = 2.8 - Math.sin(i / 13 * Math.PI) * 0.12;
    const bm = glow([C.purple, C.cyan, C.pink, C.warm][i % 4], 2.4); R.glowMats.push(bm);
    const b = sphere(0.022, bm, -2.97, y, z, fx, 10); b.castShadow = false; bulbs.push(b);
  }
  R.anim.push(function(dt, t){ bulbs.forEach(function(b, i){ b.material.emissiveIntensity = 1.4 + 1.6 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.3)); }); });
  // para nad kubkiem
  const steamM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  const steam = [];
  for(let i = 0; i < 4; i++){ const p = sphere(0.018, steamM.clone(), -2.37, 0.87, -0.15, fx, 8); p.castShadow = false; steam.push(p); }
  R.anim.push(function(dt, t){ steam.forEach(function(p, i){ const k = (t * 0.5 + i / steam.length) % 1; p.position.set(-2.37 + Math.sin(k * 6 + i) * 0.015, 0.86 + k * 0.22, -0.15); p.scale.setScalar(0.6 + k * 1.4); p.material.opacity = 0.4 * (1 - k); }); });
  // hologram na regale
  const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), new THREE.MeshBasicMaterial({ color: 0x2de2e6, transparent: true, opacity: 0.4, wireframe: true }));
  holo.position.set(-2.8, 1.84, -2.13); fx.add(holo);
  const holoCore = sphere(0.03, glow(C.purple, 3), -2.8, 1.84, -2.13, fx, 16); holoCore.castShadow = false;
  R.anim.push(function(dt, t){ holo.rotation.y += dt * 0.9; holo.rotation.x = Math.sin(t) * 0.3; holo.position.y = 1.84 + Math.sin(t * 1.6) * 0.015; });
  // przyciski pada i pierscien glosnika na stoliku
  sphere(0.014, glow(C.purple, 2), 1.4, 0.48, -0.5, fx, 10); sphere(0.014, glow(C.cyan, 2), 1.5, 0.48, -0.47, fx, 10);
  const spk = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.006, 8, 32), glow(C.cyan, 1.6)); spk.rotation.x = Math.PI / 2; spk.position.set(1.0, 0.525, -0.63); fx.add(spk);

  // ---------- lampa lukowa przy kanapie: swiecaca zarowka + swiatlo dla postaci i psa; klikalna ----------
  const LAMP = new THREE.Vector3(2.12, 1.6, 0.92);
  const bulbM = glow(C.warm, 4); 
  const bulb = sphere(0.05, bulbM, LAMP.x, LAMP.y - 0.02, LAMP.z, fx, 16); bulb.castShadow = false;
  const lampLight = new THREE.PointLight(0xffc58a, 2.2, 5, 1.4); lampLight.position.copy(LAMP).add(new THREE.Vector3(0, -0.15, 0)); scene.add(lampLight);
  const lampHit = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.9, 12), new THREE.MeshBasicMaterial({ visible: false }));
  lampHit.position.set(2.45, 0.95, 0.75); scene.add(lampHit);
  R.lamp = { bulb: bulbM, light: lampLight, hit: lampHit };

  // ---------- swiatla czasu rzeczywistego (tylko dla postaci, psa i roslin) ----------
  const hemi = new THREE.HemisphereLight(0xbfc8ff, 0x5a3a2a, 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 1.6); sun.position.set(-4.5, 7, -6.5); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xc8d0ff, 0.7); fill.position.set(6, 5, 6); scene.add(fill);
  const lamp = new THREE.PointLight(C.warm, 1.2, 4, 1.6); lamp.position.set(-2.5, 1.25, 0.3); scene.add(lamp);
  const neonL = new THREE.PointLight(C.purple, 1.4, 4.5, 1.6); neonL.position.set(-2.6, 2.3, -0.7); scene.add(neonL);
  const tvL = new THREE.PointLight(C.cyan, 1.0, 4, 1.6); tvL.position.set(1.8, 1.6, -2.3); scene.add(tvL);
  R.lights = { hemi: hemi, sun: sun, fill: fill, lamp: lamp, neon: neonL, tv: tvL };

  // ---------- punkty dla psa i hotspotow (jak w room.js) ----------
  R.dog.sofa = new THREE.Vector3(1.52, 0.47, 0.97);
  R.dog.bowl = new THREE.Vector3(-0.07, 0, -2.66);
  R.dog.owner = new THREE.Vector3(-1.5, 0, -0.2);
  R.dog.bed = new THREE.Vector3(-2.42, 0.07, 1.2);
  R.anchors = {
    desk: new THREE.Vector3(-2.6, 1.95, -0.7), wall: new THREE.Vector3(-2.85, 2.6, 1.5), board: new THREE.Vector3(-0.5, 2.55, -2.85),
    console: new THREE.Vector3(1.6, 1.05, -2.6), shelf: new THREE.Vector3(-2.75, 2.55, -2.45),
    tv: new THREE.Vector3(1.8, 2.45, -2.8)
  };

  R.update = function(dt, t, typing){
    R.anim.forEach(function(f){ f(dt, t); });
    R.screens.main.update(dt, typing); R.screens.side.update(dt); R.screens.tv.update(dt);
    R.screens.board.update(dt);
  };
  return R;
}

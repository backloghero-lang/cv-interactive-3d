import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { buildRoom } from "./room.js?v=20261018c";
import { buildBakedRoom, load as loadModel } from "./roomBaked.js?v=20261018c";
import { buildCharacter } from "./character.js?v=20261018c";
import { buildDog } from "./dog.js?v=20261018c";
import { createAudio } from "./audio.js?v=20261018c";
import { TEXT, PROFILE } from "./content.js?v=20261018c";
import { LOGOS } from "./screens.js?v=20261018c";
import { ease, lerp } from "./util.js?v=20261018c";

const $ = function(id){ return document.getElementById(id); };
const touch = window.matchMedia("(pointer: coarse)").matches;
const lowPower = touch || (navigator.hardwareConcurrency || 8) <= 4;
// jezyk: zapamietany wybor, a domyslnie polski (angielski dla przegladarek w innym jezyku)
let lang = (function(){
  let stored = null; try{ stored = localStorage.getItem("cv-lang"); }catch(e){}
  if(stored === "pl" || stored === "en") return stored;
  return /^pl/i.test(navigator.language || "pl") ? "pl" : "en";
})();
const T = function(){ return TEXT[lang]; };

// ---------- renderer, scena, kamera ----------
const canvas = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !lowPower, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const HOME = { pos: new THREE.Vector3(7.4, 5.7, 7.4), target: new THREE.Vector3(-0.1, 1.05, -0.1) };
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.enableZoom = touch;          // zoom tylko palcami na telefonie
controls.minDistance = 4; controls.maxDistance = 15;
controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.32;
controls.minAzimuthAngle = 0.05; controls.maxAzimuthAngle = 1.5;
controls.rotateSpeed = 0.6;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ---------- punkty interakcji ----------
const VIEWS = {
  desk:    { pos: [0.3, 3.15, -0.4], target: [-2.75, 1.1, -0.6] },
  wall:    { pos: [0.75, 1.85, 1.55], target: [-2.95, 1.7, 1.5] },
  tv:      { pos: [1.8, 1.75, 0.95], target: [1.8, 1.55, -2.95] },
  shelf:   { pos: [-0.35, 1.85, -0.55], target: [-2.8, 1.2, -2.45] },
  console: { pos: [1.68, 1.5, -1.2], target: [1.68, 0.66, -2.72] },
  board:   { pos: [-0.5, 1.8, 0.45], target: [-0.5, 1.75, -2.95] },

};
// TV nie ma punktu interakcji - tylko wyswietla notowania
const ORDER = ["desk", "wall", "board", "console", "shelf"];
let R, hero, dog, pins = {}, focused = null, flight = null, savedHome = null, far = 1;
const audio = createAudio();

function fly(toPos, toTarget, dur, done){
  flight = { fromPos: camera.position.clone(), fromT: controls.target.clone(), toPos: toPos.clone(), toT: toTarget.clone(), t: 0, dur: dur || 1.4, done: done };
}
function focus(key){
  if(flight) return;
  if(!focused) savedHome = { pos: camera.position.clone(), target: controls.target.clone() };
  focused = key; controls.enabled = false;
  document.body.classList.add("is-focused");
  const v = VIEWS[key], target = new THREE.Vector3().fromArray(v.target);
  const pos = new THREE.Vector3().fromArray(v.pos).sub(target).multiplyScalar(far).add(target);
  fly(pos, target, 1.5);
  openPanel(key);
}
function unfocus(){
  if(!focused) return;
  focused = null; closePanel();
  document.body.classList.remove("is-focused");
  const back = savedHome || HOME;
  fly(back.pos, back.target, 1.3, function(){ controls.enabled = true; });
}

function makePins(){
  const layer = $("pins"); layer.innerHTML = "";
  ORDER.forEach(function(key, i){
    const b = document.createElement("button");
    b.className = "pin"; b.type = "button"; b.dataset.key = key;
    b.style.setProperty("--d", (i * 0.37) + "s");
    b.innerHTML = '<span class="pin-dot"></span><span class="pin-label"></span>';
    b.addEventListener("click", function(e){ e.stopPropagation(); focus(key); });
    layer.appendChild(b); pins[key] = b;
  });
  // lampa: taki sam znacznik, ale klikniecie tylko ja zapala/gasi (bez kamery i panelu)
  if(R.lamp && R.anchors.lamp){
    const b = document.createElement("button");
    b.className = "pin pin-lamp"; b.type = "button"; b.dataset.key = "lamp";
    b.innerHTML = '<span class="pin-dot"></span><span class="pin-label"></span>';
    b.addEventListener("click", function(e){ e.stopPropagation(); setLamp(!lampOn); });
    layer.appendChild(b); pins.lamp = b;
  }
  updatePinLabels();
}
function updatePinLabels(){
  Object.keys(pins).forEach(function(k){
    const label = k === "lamp" ? (lampOn ? T().lampOff : T().lampOn) : T().hotspots[k];
    pins[k].querySelector(".pin-label").textContent = label; pins[k].setAttribute("aria-label", label);
  });
}
const tmpV = new THREE.Vector3();
function placePins(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  Object.keys(pins).forEach(function(k){
    tmpV.copy(R.anchors[k]).project(camera);
    const vis = tmpV.z < 1 && Math.abs(tmpV.x) < 1.05 && Math.abs(tmpV.y) < 1.05;
    pins[k].style.transform = "translate(" + ((tmpV.x * 0.5 + 0.5) * w) + "px," + ((-tmpV.y * 0.5 + 0.5) * h) + "px)";
    pins[k].classList.toggle("hidden", !vis);
  });
}

// ---------- panele ----------
function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function link(href, label){ return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(label) + "</a>"; }
function panelHtml(key){
  const p = T().panels[key];
  let h = '<p class="kicker">' + esc(p.kicker) + "</p><h2>" + esc(p.title) + "</h2>";
  if(key === "desk"){
    h += '<p class="role">' + esc(T().title) + "</p><p>" + esc(p.lead) + '</p><ul class="contact">';
    p.contact.forEach(function(c){
      const v = PROFILE[c.key];
      const val = c.key === "email" ? '<a href="mailto:' + esc(v) + '">' + esc(v) + "</a>" : /^https/.test(v) ? link(v, v.replace(/^https:\/\/(www\.)?/, "")) : esc(v);
      h += "<li><span>" + esc(c.label) + "</span>" + val + "</li>";
    });
    h += "</ul>" + '<a class="btn" href="' + esc(T().cvFile) + '" download>' + esc(T().cv) + " (PDF)</a>";
  }
  if(key === "wall"){
    h += '<ol class="timeline">';
    p.jobs.forEach(function(j){
      const logo = j.logo && LOGOS[j.logo] ? '<span class="tl-logo" style="background:' + LOGOS[j.logo].bg + '"><img src="' + esc(LOGOS[j.logo].src) + '" alt="' + esc(j.co) + '"></span>' : "";
      h += "<li>" + logo + "<div class='tl-head'><b>" + esc(j.co) + "</b><span>" + esc(j.years) + "</span></div><p class='role'>" + esc(j.role) + "</p><ul>" +
        j.points.map(function(x){ return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></li>";
    });
    h += "</ol>";
  }
  if(key === "tv") h += "<p>" + esc(p.lead) + '</p><p class="note">' + esc(p.note) + "</p>";
  if(key === "shelf"){
    h += '<ul class="certs">' + p.certs.map(function(c){ return "<li><b>" + esc(c[0]) + "</b><span>" + esc(c[1]) + "</span></li>"; }).join("") + "</ul>";
    h += '<p class="edu">🎓 ' + esc(p.edu) + "</p>";
  }
  if(key === "console"){
    h += "<p>" + esc(p.lead) + "</p>";
    p.projects.forEach(function(pr){
      h += '<div class="project"><h3>' + esc(pr.name) + "</h3><p>" + esc(pr.desc) + '</p><div class="links">' + pr.links.map(function(l){ return link(l[1], l[0] + " ↗"); }).join("") + "</div></div>";
    });
  }
  if(key === "board"){
    p.groups.forEach(function(g){ h += "<h3>" + esc(g[0]) + '</h3><ul class="chips">' + g[1].map(function(s){ return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>"; });
  }
  if(key === "hobby") h += "<p>" + esc(p.lead) + '</p><p class="note">' + esc(p.note) + "</p>";
  return h;
}
function openPanel(key){
  $("panelBody").innerHTML = panelHtml(key);
  $("panel").classList.add("open"); $("panel").setAttribute("aria-hidden", "false");
  $("panel").scrollTop = 0;
  setTimeout(function(){ $("panelClose").focus({ preventScroll: true }); }, 50);
}
function closePanel(){ $("panel").classList.remove("open"); $("panel").setAttribute("aria-hidden", "true"); }

// ---------- lampa przy kanapie (zawsze noc; wlaczona/zgaszona) ----------
// off = pokoj oswietlaja tylko neony, LED-y i ekrany; on = cieple swiatlo lampy. Wypalone swiatlo przechodzi plynnie.
const MODES = {
  off: { hemi: 0.45, sun: 0.3, sunColor: 0x8fa6ff, fill: 0.3, lamp: 2.4, neon: 3.2, tv: 1.8, bloom: 0.85, exposure: 1.2, neonGlow: 1.05, glowK: 1.2 },
  on:  { hemi: 0.95, sun: 0.6, sunColor: 0xffd9b0, fill: 0.7, lamp: 1.6, neon: 2.2, tv: 1.2, bloom: 0.6, exposure: 1.2, neonGlow: 0.95, glowK: 0.95 }
};
let lampOn = true, modeK = 1, modeTarget = 1;
const glowBase = new Map();
function setLamp(v){
  lampOn = v; modeTarget = v ? 1 : 0;
  document.body.classList.add("night");
  if(R.sky){ R.sky.mat.map = R.sky.night; R.sky.mat.needsUpdate = true; }
  if(pins.lamp){ pins.lamp.classList.toggle("off", !v); updatePinLabels(); }
}
function applyMode(){
  const a = MODES.off, b = MODES.on, k = modeK, L = R.lights;
  L.hemi.intensity = lerp(a.hemi, b.hemi, k); L.sun.intensity = lerp(a.sun, b.sun, k);
  L.sun.color.setHex(a.sunColor).lerp(new THREE.Color(b.sunColor), k);
  L.fill.intensity = lerp(a.fill, b.fill, k); L.lamp.intensity = lerp(a.lamp, b.lamp, k);
  L.neon.intensity = lerp(a.neon, b.neon, k); L.tv.intensity = lerp(a.tv, b.tv, k);
  bloom.strength = lerp(a.bloom, b.bloom, k);
  renderer.toneMappingExposure = lerp(a.exposure, b.exposure, k);
  const ng = lerp(a.neonGlow, b.neonGlow, k); R.neon.color.setRGB(ng, ng, ng);
  const gk = lerp(a.glowK, b.glowK, k);
  R.glowMats.forEach(function(m){ if(!glowBase.has(m)) glowBase.set(m, m.emissiveIntensity); m.emissiveIntensity = glowBase.get(m) * gk; });
  if(R.bakedMat) R.bakedMat.uniforms.mixK.value = k;
  if(R.lamp){ R.lamp.bulb.emissiveIntensity = 0.15 + 4 * k; R.lamp.light.intensity = 2.2 * k; }
}
// klikniecie w lampe w pokoju tez ja wlacza/gasi (bez reakcji na przeciaganie kamery)
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
canvas.addEventListener("pointerdown", function(e){ downAt = [e.clientX, e.clientY]; });
canvas.addEventListener("pointerup", function(e){
  if(!downAt || !R || !R.lamp || focused) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]); downAt = null;
  if(moved > 6) return;
  ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if(ray.intersectObject(R.lamp.hit, false).length) setLamp(!lampOn);
});
canvas.addEventListener("pointermove", function(e){
  if(!R || !R.lamp || e.buttons) return;
  ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  canvas.style.cursor = ray.intersectObject(R.lamp.hit, false).length ? "pointer" : "";
});
// ---------- jezyk i UI ----------
function applyLang(){
  document.documentElement.lang = lang;
  $("who").textContent = T().title; $("sub").textContent = T().subtitle;
  $("hint").textContent = touch ? T().hintTouch : T().hint;
  $("btnLang").textContent = lang === "pl" ? "EN" : "PL";
  $("btnCv").textContent = T().cv; $("btnCv").href = T().cvFile;
  $("textLink").textContent = T().textVersion;
  $("enterBtn").textContent = T().enter; $("loadText").textContent = T().loading;
  $("panelClose").setAttribute("aria-label", T().close);
  $("btnSound").title = audio.on ? T().soundOn : T().soundOff;
  if(pins.desk) updatePinLabels();
  if(focused) $("panelBody").innerHTML = panelHtml(focused);
}
$("btnLang").addEventListener("click", function(){ lang = lang === "pl" ? "en" : "pl"; try{ localStorage.setItem("cv-lang", lang); }catch(e){} applyLang(); });
$("btnSound").addEventListener("click", function(){ const on = audio.toggle(); $("btnSound").classList.toggle("on", on); $("btnSound").textContent = on ? "🔊" : "🔈"; $("btnSound").title = on ? T().soundOn : T().soundOff; });
$("panelClose").addEventListener("click", unfocus);
window.addEventListener("keydown", function(e){
  if(e.key === "Escape") unfocus();
});

// ---------- rozmiar ----------
function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); composer.setSize(w, h);
  bloom.resolution.set(w / (lowPower ? 2 : 1), h / (lowPower ? 2 : 1));
  camera.aspect = w / h;
  // na waskim (pionowym) ekranie odsuwamy kamere, zeby caly pokoj (i zblizane obiekty) miescily sie w poziomie
  far = Math.pow(Math.max(1, 1.3 / (w / h)), 0.9);
  HOME.pos.set(7.4, 5.7, 7.4).sub(HOME.target).multiplyScalar(far).add(HOME.target);
  controls.maxDistance = 15 * far;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

// ---------- budowa sceny z paskiem postepu ----------
// pauza miedzy etapami budowy, zeby pasek postepu zdazyl sie odmalowac (setTimeout dziala tez w karcie w tle)
function step(pct){ $("loadBar").style.width = pct + "%"; return new Promise(function(r){ setTimeout(r, 40); }); }
async function init(){
  applyLang();
  await step(10);
  // pokoj z Blendera (wypalone swiatlo); gdy pliki sie nie wczytaja - pokoj budowany w kodzie
  try{
    R = await buildBakedRoom(scene, { getLang: function(){ return lang; }, onProgress: function(p){ $("loadBar").style.width = (10 + p * 35) + "%"; } });
  }catch(e){
    console.warn("Pokoj z Blendera niedostepny, uzywam wersji z kodu", e);
    R = buildRoom(scene, { getLang: function(){ return lang; }, lowPower: lowPower });
  }
  if(R.baked) bloom.threshold = 0.93;   // wypalony pokoj jest jasny - poswiata tylko dla neonow i LED-ow
  await step(45);
  // postac i pies z Blendera (gdy plik sie nie wczyta - wersje z kodu)
  let actors = null;
  if(R.baked){ try{ actors = (await loadModel("assets/room/actors.glb?v=20261018c")).scene; }catch(e){ console.warn("Brak modeli postaci", e); } }
  hero = buildCharacter(scene, R.seat, actors);
  await step(60);
  dog = buildDog(scene, R.dog, hero, actors);
  await step(75);
  makePins();
  resize();
  setLamp(true); modeK = modeTarget; applyMode();
  renderer.compile(scene, camera);
  await step(100);
  $("loader").classList.add("ready");
  $("enterBtn").disabled = false;
  $("enterBtn").focus();
  // ?og=1 - tryb do zrobienia obrazka podgladu linku: od razu w pokoju, noc, bez interfejsu
  if(/[?&]og=1/.test(location.search)){
    document.body.classList.add("og"); $("loader").remove();
    setLamp(true); modeK = 1; applyMode(); frame(0.016);
  }
  requestAnimationFrame(loop);
}
$("enterBtn").addEventListener("click", function(){
  $("loader").classList.add("gone");
  document.body.classList.add("entered");
  // wejscie: kamera dojezdza z daleka
  camera.position.copy(HOME.pos).sub(HOME.target).multiplyScalar(1.6).add(HOME.target);
  controls.enabled = false;
  fly(HOME.pos, HOME.target, 2.2, function(){ controls.enabled = true; });
});

const clock = new THREE.Clock();
let time = 0;
function loop(){
  requestAnimationFrame(loop);
  frame(Math.min(clock.getDelta(), 0.05));
  composer.render();
}
// podglad do testow: przewiniecie animacji o zadany czas (karta w tle nie dostaje klatek)
window.__room = { camera: camera, controls: controls, get dog(){ return dog; }, advance: function(sec){ for(let s = 0; s < sec; s += 1 / 30) frame(1 / 30); composer.render(); } };
// gdy panel jest otwarty, przesuwamy srodek kadru tak, by obiekt byl na widocznej czesci ekranu
let offX = 0, offY = 0;
function updateViewOffset(dt){
  const w = window.innerWidth, h = window.innerHeight, panel = $("panel"), open = panel.classList.contains("open");
  const mobile = w <= 640;
  const tx = open && !mobile ? panel.offsetWidth / 2 : 0, ty = open && mobile ? panel.offsetHeight / 2 : 0;
  offX += (tx - offX) * Math.min(1, dt * 4); offY += (ty - offY) * Math.min(1, dt * 4);
  if(Math.abs(offX) < 0.5 && Math.abs(offY) < 0.5 && !open){ if(camera.view && camera.view.enabled){ camera.clearViewOffset(); } return; }
  camera.setViewOffset(w, h, offX, offY, w, h);
}
function frame(dt){
  time += dt;
  updateViewOffset(dt);
  if(flight){
    flight.t += dt; const k = ease(Math.min(1, flight.t / flight.dur));
    camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
    controls.target.lerpVectors(flight.fromT, flight.toT, k);
    camera.lookAt(controls.target);
    if(flight.t >= flight.dur){ const d = flight.done; flight = null; if(d) d(); }
  } else if(controls.enabled) controls.update();
  if(Math.abs(modeK - modeTarget) > 0.001){ modeK += (modeTarget - modeK) * Math.min(1, dt * 3); applyMode(); }
  const typing = hero.update(dt, time);
  dog.update(dt, time);
  R.update(dt, time, typing);
  audio.tick(dt, typing);
  placePins();
}
init();

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C, mat, canvasTexture } from "./util.js";

// element wysrodkowany w punkcie (x,y,z) wzgledem rodzica
function part(w, h, d, material, parent, x, y, z, r){
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min((r == null ? 0.03 : r) * 1.7, w / 2 - 0.0005, h / 2 - 0.0005, d / 2 - 0.0005))   /* oble ksztalty */, material);
  m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function pivot(parent, x, y, z){ const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; }

// koszula w krate (jak na zdjeciu z CV): szaro-biala z czerwonymi i czarnymi pasami
function plaid(){
  const t = canvasTexture(128, 128, function(ctx, w, h){
    ctx.fillStyle = "#d9d9dc"; ctx.fillRect(0, 0, w, h);
    const bands = [[0, 22, "rgba(30,30,38,.85)"], [40, 10, "rgba(170,40,45,.75)"], [64, 22, "rgba(30,30,38,.85)"], [104, 10, "rgba(170,40,45,.75)"]];
    bands.forEach(function(b){ ctx.fillStyle = b[2]; ctx.fillRect(b[0], 0, b[1], h); });
    bands.forEach(function(b){ ctx.fillStyle = b[2]; ctx.globalAlpha = 0.7; ctx.fillRect(0, b[0], w, b[1]); ctx.globalAlpha = 1; });
    ctx.fillStyle = "rgba(255,255,255,.25)"; for(let i = 0; i < w; i += 4) ctx.fillRect(i, 0, 1, h);
  }).tex;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.magFilter = THREE.NearestFilter;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
}

// Postac w lokalnym ukladzie patrzy w -z; cala grupa obrocona tak, by patrzyla w sciane z monitorami (-x).
export function buildCharacter(scene, seat){
  const root = new THREE.Group();
  root.position.set(seat.x, 0, seat.z);
  root.rotation.y = Math.PI / 2;
  scene.add(root);
  const skin = mat(C.skin), shirt = plaid(), jeans = mat(C.jeans), dark = mat(C.cap), beard = mat(C.beard), white = mat(C.shoe);

  // nogi (siedzi): uda poziomo do przodu, lydki w dol
  [-0.1, 0.1].forEach(function(x){
    part(0.15, 0.15, 0.44, jeans, root, x, 0.6, -0.2);
    part(0.13, 0.48, 0.14, jeans, root, x, 0.34, -0.42);
    part(0.14, 0.08, 0.26, white, root, x, 0.06, -0.48, 0.035);
  });
  part(0.36, 0.16, 0.3, jeans, root, 0, 0.62, 0.0);

  // tulow (lekko pochylony do monitora)
  const torso = pivot(root, 0, 0.66, 0.02);
  torso.rotation.x = -0.14;
  part(0.42, 0.52, 0.25, shirt, torso, 0, 0.26, 0, 0.06);
  part(0.2, 0.05, 0.05, mat(0xf0f0f0), torso, 0, 0.5, -0.11);   // kolnierzyk / t-shirt pod spodem

  // glowa
  const neck = pivot(torso, 0, 0.52, 0);
  part(0.11, 0.08, 0.11, skin, neck, 0, 0.03, 0);
  const head = pivot(neck, 0, 0.08, 0);
  part(0.26, 0.3, 0.26, skin, head, 0, 0.15, 0, 0.07);
  part(0.28, 0.15, 0.22, beard, head, 0, 0.06, -0.03, 0.06);        // broda
  part(0.12, 0.03, 0.04, beard, head, 0, 0.13, -0.13, 0.012);      // wasy
  part(0.04, 0.05, 0.05, skin, head, 0, 0.17, -0.14, 0.015);       // nos
  [-0.065, 0.065].forEach(function(x){ part(0.035, 0.03, 0.02, mat(0x1b1410), head, x, 0.21, -0.13, 0.008); });  // oczy
  [-0.135, 0.135].forEach(function(x){ part(0.03, 0.07, 0.05, skin, head, x, 0.17, 0.0, 0.012); });            // uszy
  // krotkie ciemne wlosy z tylu i po bokach (widoczne spod czapki)
  part(0.27, 0.16, 0.08, beard, head, 0, 0.2, 0.1, 0.04);
  [-0.128, 0.128].forEach(function(x){ part(0.025, 0.12, 0.16, beard, head, x, 0.22, 0.04, 0.012); });
  // czapka z daszkiem (czarna z bialym logo)
  part(0.28, 0.12, 0.28, dark, head, 0, 0.3, 0.0, 0.08);
  part(0.25, 0.02, 0.17, dark, head, 0, 0.26, -0.19, 0.008);
  part(0.06, 0.03, 0.01, mat(0xffffff), head, 0, 0.32, -0.142, 0.004);

  // rece: ramie (bark) -> lokiec -> dlon, ustawione do pisania
  const arms = [];
  [-1, 1].forEach(function(side){
    const shoulder = pivot(torso, side * 0.25, 0.46, -0.02);
    part(0.12, 0.3, 0.13, shirt, shoulder, 0, -0.14, 0, 0.05);
    const elbow = pivot(shoulder, 0, -0.28, 0);
    part(0.11, 0.27, 0.11, shirt, elbow, 0, -0.12, 0, 0.045);
    const hand = pivot(elbow, 0, -0.27, 0);
    part(0.09, 0.09, 0.05, skin, hand, 0, -0.03, 0, 0.025);
    arms.push({ side: side, shoulder: shoulder, elbow: elbow, hand: hand });
  });

  // ---------- animacja ----------
  const A = { mode: "type", timer: 0, look: 0, lookTarget: 0, pitch: 0, pitchTarget: 0, dogNear: false, click: 0 };
  function schedule(){
    // co kilka sekund: mysz, zerkniecie na drugi monitor albo dalej pisanie
    const r = Math.random();
    A.mode = r < 0.35 ? "mouse" : r < 0.55 ? "glance" : "type";
    A.timer = A.mode === "type" ? 4 + Math.random() * 4 : 2.5 + Math.random() * 2;
  }
  schedule();
  const base = { s: 0.48, e: 1.0 };
  return {
    root: root,
    headWorld: function(v){ return head.getWorldPosition(v); },
    setDogNear: function(v){ A.dogNear = v; },
    isTyping: function(){ return A.mode === "type" && !A.dogNear; },
    update: function(dt, t){
      A.timer -= dt; if(A.timer <= 0) schedule();
      const typing = A.mode === "type" && !A.dogNear;
      // oddech
      torso.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
      // glowa: monitor glowny / boczny / pies
      A.lookTarget = A.dogNear ? 1.0 : A.mode === "glance" ? 0.55 : Math.sin(t * 0.4) * 0.06;
      A.pitchTarget = A.dogNear ? 0.35 : A.mode === "type" ? 0.08 : 0.02;
      A.look += (A.lookTarget - A.look) * Math.min(1, dt * 4);
      A.pitch += (A.pitchTarget - A.pitch) * Math.min(1, dt * 4);
      head.rotation.y = A.look; head.rotation.x = A.pitch;
      arms.forEach(function(a, i){
        let s = base.s, e = base.e, z = 0, hx = 0;
        if(typing){
          const k = Math.sin(t * 15 + i * 1.7) * 0.5 + 0.5;
          s += Math.sin(t * 2.3 + i) * 0.04; e += k * 0.07; hx = k * 0.25;
        }
        if(a.side === 1 && A.mode === "mouse" && !A.dogNear){
          z = 0.42; s = 0.5; e = 1.05;   // z > 0 = reka odsunieta na zewnatrz (do myszy)
          A.click += dt; hx = (A.click % 0.9) < 0.12 ? 0.35 : 0;   // klikniecie
        }
        if(a.side === -1 && A.dogNear){ s = 0.2; e = 0.4; z = 0.25; hx = Math.sin(t * 6) * 0.3; }   // glaskanie psa
        a.shoulder.rotation.x += (s - a.shoulder.rotation.x) * Math.min(1, dt * 8);
        a.shoulder.rotation.z += (z * a.side - a.shoulder.rotation.z) * Math.min(1, dt * 6);
        a.elbow.rotation.x += (e - a.elbow.rotation.x) * Math.min(1, dt * 8);
        a.hand.rotation.x = hx;
      });
      return typing;
    }
  };
}

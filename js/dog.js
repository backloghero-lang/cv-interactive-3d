import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mat, ease } from "./util.js?v=20261018b";

function part(w, h, d, material, parent, x, y, z, r){
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min((r == null ? 0.03 : r) * 1.7, w / 2 - 0.0005, h / 2 - 0.0005, d / 2 - 0.0005))   /* oble ksztalty */, material);
  m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
function pivot(parent, x, y, z){ const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; }

// Beagle (lokalnie przodem do +z). Model z Blendera (blender/build_actors.py) albo wersja z kodu, gdy modelu brak.
// Petla: spi (na zmiane na kanapie i na legowisku) -> miska pod kwiatkiem -> do pana -> drugie miejsce do spania.
export function buildDog(scene, P, character, model){
  let root, body, neck, head, eyes = [], ears = [], tail, legs = [], curl;
  const fromModel = model && model.getObjectByName("DOG_root");
  if(fromModel){
    root = fromModel; scene.add(root); root.position.set(0, 0, 0);
    root.traverse(function(o){ if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; if(o.material) o.material.metalness = 0; } });
    body = root.getObjectByName("pv_body"); neck = root.getObjectByName("pv_dneck"); head = root.getObjectByName("pv_dhead");
    eyes = ["dogEyeL", "dogEyeR"].map(function(n){ return root.getObjectByName(n); }).filter(Boolean);
    ears = ["pv_dear_L", "pv_dear_R"].map(function(n){ return root.getObjectByName(n); });
    tail = root.getObjectByName("pv_tail"); curl = root.getObjectByName("DOG_curl");
    for(let k = 0; k < 4; k++) legs.push(root.getObjectByName("pv_leg_" + k));
    tail.rotation.x = -0.5; curl.visible = false;
  } else {
    const built = buildProcedural(scene);
    root = built.root; body = built.body; neck = built.neck; head = built.head; eyes = built.eyes; ears = built.ears; tail = built.tail; legs = built.legs; curl = built.curl;
  }
  // miekki cien pod psem (podloga z wypalonym swiatlem nie przyjmuje cieni czasu rzeczywistego)
  const shC = document.createElement("canvas"); shC.width = shC.height = 64;
  const sctx = shC.getContext("2d"), sg = sctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  sg.addColorStop(0, "rgba(0,0,0,.55)"); sg.addColorStop(1, "rgba(0,0,0,0)"); sctx.fillStyle = sg; sctx.fillRect(0, 0, 64, 64);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.62), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shC), transparent: true, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.012; blob.renderOrder = 1; root.add(blob);
  // ---------- trasa ----------
  // dwa miejsca do spania na zmiane: kanapa i legowisko (miedzy biurkiem a roslina)
  const sofaFront = new THREE.Vector3(1.45, 0, 0.3), mid = new THREE.Vector3(0.45, 0, 0.15);
  const bedFront = new THREE.Vector3(P.bed.x + 0.48, 0, P.bed.z - 0.05);
  const bowlStand = new THREE.Vector3(P.bowl.x, 0, P.bowl.z + 0.42), owner = P.owner.clone();
  const begFace = new THREE.Vector3(P.owner.x - 0.6, 0, P.owner.z - 0.6);
  const steps = [
    { s: "sleep", d: 14 },
    { s: "stand", d: 1.2 },
    { s: "jump", from: P.sofa, to: sofaFront, d: 0.7 },
    { s: "walk", to: mid }, { s: "walk", to: bowlStand },
    { s: "eat", d: 3.5, face: P.bowl },
    { s: "walk", to: owner },
    { s: "beg", d: 5, face: begFace },
    { s: "walk", to: bedFront },
    { s: "jump", from: bedFront, to: P.bed, d: 0.55, h: 0.15 },
    { s: "turn", d: 1.2 }, { s: "lie", d: 1.4 },
    { s: "sleep", d: 14 },
    { s: "stand", d: 1.2 },
    { s: "jump", from: P.bed, to: bedFront, d: 0.55, h: 0.15 },
    { s: "walk", to: bowlStand },
    { s: "eat", d: 3.0, face: P.bowl },
    { s: "walk", to: owner },
    { s: "beg", d: 4, face: begFace },
    { s: "walk", to: mid }, { s: "walk", to: sofaFront },
    { s: "jump", from: sofaFront, to: P.sofa, d: 0.7 },
    { s: "turn", d: 1.2 }, { s: "lie", d: 1.4 }
  ];  let i = 0, tt = 0, from = P.sofa.clone(), heading = -Math.PI / 2, gait = 0;
  root.position.copy(P.sofa); root.rotation.y = heading;
  function faceTo(target, dt){
    const want = Math.atan2(target.x - root.position.x, target.z - root.position.z);
    let d = want - root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    root.rotation.y += d * Math.min(1, dt * 5);
  }
  function pose(lying, sitting){
    // lezenie: lapy pod soba, niski tulow; siad: tylne lapy zgiete, przod wyprostowany
    const tl = lying ? 1 : 0, ts = sitting ? 1 : 0;
    body.position.y = -0.12 * tl - 0.04 * ts;
    body.rotation.x = -0.35 * ts;
    legs.forEach(function(l, k){ l.rotation.x = lying ? (k < 2 ? -1.35 : 1.35) : (sitting && k >= 2 ? 1.2 : 0); });
  }
  return {
    root: root,
    get state(){ return steps[i].s + "#" + i; },
    update: function(dt, t){
      const st = steps[i];
      tt += dt;
      let done = false, moving = false;
      const breathe = Math.sin(t * 2.2) * 0.02;
      body.scale.set(1 + breathe * 0.5, 1 + breathe, 1);
      const curled = st.s === "sleep" || st.s === "lie";
      body.visible = !curled; curl.visible = curled;
      if(curled){
        // spanie "w rogala" - osobny, zwiniety model; przy kladzeniu sie plynnie "wrasta" w kocyk
        const k = st.s === "lie" ? Math.min(1, tt / st.d) : 1;
        curl.scale.set(1 + breathe * 0.8, (0.6 + 0.4 * k) * (1 + breathe), 1 + breathe * 0.8);
        done = tt > st.d;
      } else {
        eyes.forEach(function(e){ e.scale.y = (Math.floor(t * 7) % 29) === 0 ? 0.2 : 1; });
      }
      if(st.s === "turn"){   // krecenie sie w kolko przed polozeniem
        pose(false, false); root.rotation.y += dt * 5.2; moving = true;
        done = tt > st.d;
      }
      if(st.s === "stand"){ pose(false, false); neck.rotation.x = 0; head.rotation.y = Math.sin(t * 2) * 0.3; done = tt > st.d; }
      if(st.s === "jump"){
        const k = Math.min(1, tt / st.d), e = ease(k);
        root.position.lerpVectors(st.from, st.to, e);
        root.position.y = THREE.MathUtils.lerp(st.from.y, st.to.y, e) + Math.sin(k * Math.PI) * (st.h || 0.35);
        faceTo(st.to, dt * 3); pose(false, false);
        legs.forEach(function(l, n){ l.rotation.x = Math.sin(k * Math.PI) * (n < 2 ? -0.8 : 0.8); });
        done = k >= 1;
      }
      if(st.s === "walk"){
        if(tt <= dt) from = root.position.clone();
        const dist = from.distanceTo(st.to), dur = Math.max(0.3, dist / 0.65), k = Math.min(1, tt / dur);
        root.position.lerpVectors(from, st.to, k);
        root.position.y = Math.abs(Math.sin(gait * 2)) * 0.012;
        faceTo(st.to, dt); pose(false, false); moving = true;
        neck.rotation.x = 0; head.rotation.y = 0;
        done = k >= 1;
      }
      if(st.s === "eat"){
        faceTo(st.face, dt); pose(false, false);
        neck.rotation.x = 0.9 + Math.sin(t * 9) * 0.12;
        done = tt > st.d;
      }
      if(st.s === "beg"){
        faceTo(st.face, dt); pose(false, true);
        neck.rotation.x = -0.45; head.rotation.y = Math.sin(t * 1.5) * 0.15;
        character.setDogNear(true);
        done = tt > st.d;
        if(done) character.setDogNear(false);
      }
      // chod i merdanie
      gait += dt * (moving ? 9 : 0);
      if(moving) legs.forEach(function(l, n){ l.rotation.x = Math.sin(gait + (n === 0 || n === 3 ? 0 : Math.PI)) * 0.55; });
      const wag = st.s === "beg" || st.s === "eat" || moving ? 14 : 3;
      if(st.s !== "sleep" && st.s !== "lie") { tail.rotation.x = -0.5; tail.rotation.z = Math.sin(t * wag) * (st.s === "beg" ? 0.6 : 0.3); }
      ears.forEach(function(e, n){ e.rotation.z = (n ? -1 : 1) * (0.08 + (moving ? Math.abs(Math.sin(gait)) * 0.15 : 0)); });
      if(done){ i = (i + 1) % steps.length; tt = 0; from = root.position.clone(); }
    }
  };
}

// wersja z kodu (zapasowa)
function buildProcedural(scene){
  const tan = mat(0xc07a3a), white = mat(0xf4efe6), black = mat(0x24201d), ear = mat(0x7a4322), nose = mat(0x111111);
  const root = new THREE.Group(); scene.add(root);
  const body = pivot(root, 0, 0, 0);
  part(0.18, 0.17, 0.42, tan, body, 0, 0.25, 0, 0.06);
  part(0.185, 0.07, 0.3, black, body, 0, 0.325, -0.02, 0.03);
  part(0.16, 0.08, 0.36, white, body, 0, 0.19, 0.01, 0.04);
  part(0.15, 0.14, 0.1, white, body, 0, 0.26, 0.2, 0.05);
  const neck = pivot(body, 0, 0.32, 0.2);
  const head = pivot(neck, 0, 0.04, 0.05);
  part(0.15, 0.14, 0.15, tan, head, 0, 0.0, 0.0, 0.05);
  part(0.06, 0.12, 0.13, white, head, 0, -0.005, 0.02, 0.02);
  part(0.1, 0.08, 0.1, white, head, 0, -0.03, 0.1, 0.035);
  part(0.045, 0.035, 0.03, nose, head, 0, -0.005, 0.15, 0.012);
  const eyes = [];
  [-0.045, 0.045].forEach(function(x){ eyes.push(part(0.025, 0.025, 0.015, nose, head, x, 0.025, 0.075, 0.008)); });
  const ears = [];
  [-1, 1].forEach(function(s){ const e = pivot(head, s * 0.08, 0.03, -0.01); part(0.025, 0.15, 0.08, ear, e, 0, -0.07, 0, 0.012); ears.push(e); });
  const tail = pivot(body, 0, 0.32, -0.2);
  part(0.035, 0.14, 0.035, tan, tail, 0, 0.07, 0, 0.015);
  part(0.04, 0.05, 0.04, white, tail, 0, 0.15, 0, 0.018);
  tail.rotation.x = -0.5;
  const legs = [];
  [[-0.06, 0.15], [0.06, 0.15], [-0.06, -0.15], [0.06, -0.15]].forEach(function(p, i){
    const l = pivot(body, p[0], 0.19, p[1]);
    part(0.055, 0.19, 0.055, i < 2 ? white : tan, l, 0, -0.09, 0, 0.02);
    part(0.06, 0.03, 0.07, white, l, 0, -0.18, 0.01, 0.012);
    legs.push(l);
  });
  const curl = pivot(root, 0, 0, 0); curl.visible = false;
  const R0 = 0.12, ARC = Math.PI * 1.55;
  function arcPoint(th, y){ return new THREE.Vector3(R0 * Math.cos(th), y, -R0 * Math.sin(th)); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R0, 0.072, 18, 48, ARC), tan);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.075; ring.scale.set(1, 1, 0.9); curl.add(ring);
  const saddle = new THREE.Mesh(new THREE.TorusGeometry(R0 + 0.012, 0.06, 14, 40, ARC * 0.62), black);
  saddle.rotation.x = -Math.PI / 2; saddle.rotation.z = ARC * 0.18; saddle.position.y = 0.1; curl.add(saddle);
  const ch = pivot(curl, 0, 0, 0); ch.position.copy(arcPoint(ARC + 0.25, 0.1)); ch.rotation.y = ARC + 0.25 + Math.PI;
  part(0.14, 0.12, 0.15, tan, ch, 0, 0, 0, 0.05); part(0.09, 0.07, 0.09, white, ch, 0, -0.025, 0.09, 0.03);
  return { root: root, body: body, neck: neck, head: head, eyes: eyes, ears: ears, tail: tail, legs: legs, curl: curl };
}
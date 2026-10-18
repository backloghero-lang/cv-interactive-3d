import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Paleta pokoju: grafit + drewno + fiolet/cyjan (neon) + ciepla lampa
export const C = {
  wall: 0x2b2f45, wallDark: 0x23263a, floor: 0x6b4a36, floorDark: 0x5a3d2c, base: 0x1a1c2b,
  wood: 0x8a5a3c, woodDark: 0x5e3b27, desk: 0x2f3247, deskTop: 0x3a3e58,
  black: 0x15161f, metal: 0x8d93a8, white: 0xeef0f6, cream: 0xe9dfcc,
  purple: 0x9b5cff, cyan: 0x2de2e6, pink: 0xff4fa3, warm: 0xffc278,
  skin: 0xe8b48f, beard: 0x3b2a20, cap: 0x18181d, jeans: 0x2c3d5c, shoe: 0xf2f2f2,
  plant: 0x3f8f5a, plantDark: 0x2c6b42, pot: 0xd9cfc1,
  sofa: 0x4b5577, sofaDark: 0x3c4565, rug: 0x3a3358
};

const matCache = new Map();
// matowy material (low-poly), cachowany po kolorze
export function mat(color, opts){
  const key = color + JSON.stringify(opts || {});
  if(matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.82, metalness: 0.02 }, opts || {}));
  matCache.set(key, m);
  return m;
}
// material swiecacy (neony, LED) - jasny, zeby lapal bloom
export function glow(color, intensity){
  return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity == null ? 2.2 : intensity, roughness: 1 });
}

// zaokraglony prostopadloscian ustawiony dolem na y (wygodne meblowanie)
export function rbox(w, h, d, material, radius, x, y, z, parent){
  const r = Math.min(radius == null ? 0.03 : radius, w / 2, h / 2, d / 2);
  const g = new RoundedBoxGeometry(w, h, d, 3, r);
  const m = new THREE.Mesh(g, material);
  m.position.set(x || 0, (y || 0) + h / 2, z || 0);
  m.castShadow = true; m.receiveShadow = true;
  if(parent) parent.add(m);
  return m;
}
export function box(w, h, d, material, x, y, z, parent){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x || 0, (y || 0) + h / 2, z || 0);
  m.castShadow = true; m.receiveShadow = true;
  if(parent) parent.add(m);
  return m;
}
export function cyl(rt, rb, h, material, x, y, z, parent, seg){
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 20), material);
  m.position.set(x || 0, (y || 0) + h / 2, z || 0);
  m.castShadow = true; m.receiveShadow = true;
  if(parent) parent.add(m);
  return m;
}
export function sphere(r, material, x, y, z, parent, seg){
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg || 18, Math.max(8, (seg || 18) - 4)), material);
  m.position.set(x || 0, y || 0, z || 0);
  m.castShadow = true; m.receiveShadow = true;
  if(parent) parent.add(m);
  return m;
}
export function group(parent, x, y, z){
  const g = new THREE.Group();
  g.position.set(x || 0, y || 0, z || 0);
  if(parent) parent.add(g);
  return g;
}

// tekstura z canvasu (ekrany, zdjecia, etykiety); draw(ctx, w, h) rysuje zawartosc
export function canvasTexture(w, h, draw){
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  if(draw) draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { canvas: c, ctx: ctx, tex: t };
}
// plaski ekran/obraz z tekstura canvasu; emissive -> ekran swieci
export function screenMesh(w, h, tex, emissive){
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: emissive ? 0xffffff : 0x000000, emissiveMap: emissive ? tex : null, emissiveIntensity: emissive ? 0.62 : 0 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.receiveShadow = false;
  return mesh;
}

export function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export const lerp = function(a, b, t){ return a + (b - a) * t; };
export const ease = function(t){ return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const clamp = function(v, a, b){ return Math.max(a, Math.min(b, v)); };

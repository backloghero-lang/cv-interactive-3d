# Postac (Dariusz) i beagle jako gladkie, oble modele z punktami obrotu (pustymi obiektami) do animacji na stronie.
# Uzycie: blender --background --factory-startup --python blender/build_actors.py -- --out <katalog> [--preview plik.png]
# Nazwy i polozenia punktow obrotu sa takie same jak w js/character.js i js/dog.js (uklad three: Y w gore).
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(n, d=None): return argv[argv.index(n) + 1] if n in argv else d
OUT = arg("--out", os.path.join(os.path.dirname(__file__), "out")); PREVIEW = arg("--preview")
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def V(x, y, z): return Vector((x, -z, y))
def hexcol(h):
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(((h >> 16) & 255) / 255), lin(((h >> 8) & 255) / 255), lin((h & 255) / 255), 1.0)
MATS = {}
def M(name, color, rough=0.7):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = hexcol(color); b.inputs["Roughness"].default_value = rough
    MATS[name] = m; return m

def empty(name, x, y, z, parent=None):
    """Punkt obrotu w ukladzie swiata (three); rodzic ustawiany z zachowaniem polozenia."""
    e = bpy.data.objects.new(name, None); e.empty_display_size = 0.05; scene.collection.objects.link(e)
    e.location = V(x, y, z)
    if parent: set_parent(e, parent)
    return e

def set_parent(o, p):
    bpy.context.view_layer.update()
    mw = o.matrix_world.copy(); o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted(); o.matrix_world = mw

def blob(name, w, h, d, x, y, z, mat, parent, round_=0.45, soft=2, rot=(0, 0, 0)):
    """Gladka bryla: prostopadloscian z duzym zaokragleniem + wygladzenie (subdivision). Srodek w (x,y,z)."""
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bm.loops.layers.uv.new("UVMap")   # UV potrzebne np. dla kraty na koszuli
    bmesh.ops.create_cube(bm, size=1.0, calc_uvs=True)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * d, v.co.z * h))
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.location = V(x, y, z); o.rotation_euler = (rot[0], -rot[2], rot[1])
    b = o.modifiers.new("bevel", "BEVEL"); b.width = min(w, h, d) * round_ * 0.5; b.segments = 3; b.limit_method = "NONE"
    if soft: s = o.modifiers.new("soft", "SUBSURF"); s.levels = soft; s.render_levels = soft
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    set_parent(o, parent)
    return o

def ball(name, r, x, y, z, mat, parent, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=r, location=V(x, y, z))
    o = bpy.context.active_object; o.name = name; o.scale = (scale[0], scale[2], scale[1]); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    set_parent(o, parent); return o

def ring(name, R, r, arc, x, y, z, mat, parent, rotz=0.0, sy=1.0):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=40, minor_segments=14, location=V(x, y, z))
    o = bpy.context.active_object; o.name = name; o.data.materials.append(mat)
    if arc < 2 * math.pi - 1e-3:   # obciecie luku (rogal)
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if math.atan2(v.co.y, v.co.x) % (2 * math.pi) > arc], context="VERTS"); bm.to_mesh(o.data); bm.free()
    o.rotation_euler[2] = rotz; o.scale = (1, 1, sy)
    for p in o.data.polygons: p.use_smooth = True
    set_parent(o, parent); return o

# ================================================================ POSTAC (lokalnie patrzy w -z)
skin = M("skin", 0xe8b48f, 0.6); shirt = M("shirt", 0xd9d9dc, 0.85); jeans = M("jeans", 0x2c3d5c, 0.8)
dark = M("cap", 0x18181d, 0.6); beard = M("beard", 0x3b2a20, 0.9); white = M("shoe", 0xf2f2f2, 0.5); eye = M("eye", 0x1b1410, 0.3)
cr = empty("CHAR_root", 0, 0, 0)
for s, x in (("L", -0.1), ("R", 0.1)):
    blob("jeansThigh" + s, 0.15, 0.15, 0.44, x, 0.6, -0.2, jeans, cr)
    blob("jeansShin" + s, 0.13, 0.48, 0.14, x, 0.34, -0.42, jeans, cr)
    blob("shoe" + s, 0.14, 0.09, 0.27, x, 0.06, -0.49, white, cr, 0.6)
blob("jeansHips", 0.37, 0.17, 0.3, 0, 0.62, 0.0, jeans, cr)
torso = empty("pv_torso", 0, 0.66, 0.02, cr)
blob("shirtBody", 0.43, 0.54, 0.27, 0, 0.66 + 0.27, 0.02, shirt, torso, 0.55)
blob("tshirtCollar", 0.2, 0.05, 0.06, 0, 0.66 + 0.5, -0.09, M("tshirt", 0xf0f0f0), torso)
neck = empty("pv_neck", 0, 0.66 + 0.52, 0.02, torso)
blob("neck", 0.11, 0.1, 0.11, 0, 0.66 + 0.55, 0.02, skin, neck)
H = (0, 0.66 + 0.6, 0.02)
head = empty("pv_head", H[0], H[1], H[2], neck)
hy = H[1]
blob("head", 0.25, 0.3, 0.26, 0, hy + 0.15, 0.02, skin, head, 0.7)
blob("beardJaw", 0.27, 0.12, 0.21, 0, hy + 0.085, -0.015, beard, head, 0.7)
blob("mustache", 0.12, 0.03, 0.04, 0, hy + 0.13, -0.11, beard, head, 0.8)
blob("nose", 0.045, 0.06, 0.05, 0, hy + 0.17, -0.12, skin, head, 0.8)
for s, x in (("L", -0.065), ("R", 0.065)):
    ball("eye" + s, 0.017, x, hy + 0.205, -0.108, eye, head, (1, 1.1, 0.6))
    blob("brow" + s, 0.06, 0.016, 0.02, x, hy + 0.24, -0.11, beard, head, 0.8)
    blob("ear" + s, 0.03, 0.07, 0.05, x * 2.05, hy + 0.17, 0.02, skin, head, 0.8)
blob("hairBack", 0.26, 0.15, 0.08, 0, hy + 0.2, 0.12, beard, head, 0.8)
ball("capDome", 0.145, 0, hy + 0.27, 0.02, dark, head, (1.0, 0.62, 1.05))
blob("capBrim", 0.25, 0.022, 0.17, 0, hy + 0.27, -0.17, dark, head, 0.9)
blob("capLogo", 0.06, 0.03, 0.01, 0, hy + 0.33, -0.125, M("logo", 0xffffff), head, 0.5, 0)
for s, sx in (("L", -1), ("R", 1)):
    sh = empty("pv_shoulder_" + s, sx * 0.25, 0.66 + 0.46, 0.0, torso)
    blob("shirtArm" + s, 0.12, 0.31, 0.13, sx * 0.25, 0.66 + 0.46 - 0.14, 0.0, shirt, sh, 0.8)
    el = empty("pv_elbow_" + s, sx * 0.25, 0.66 + 0.46 - 0.28, 0.0, sh)
    blob("shirtForearm" + s, 0.11, 0.28, 0.11, sx * 0.25, 0.66 + 0.46 - 0.28 - 0.12, 0.0, shirt, el, 0.8)
    hd = empty("pv_hand_" + s, sx * 0.25, 0.66 + 0.46 - 0.55, 0.0, el)
    blob("hand" + s, 0.085, 0.1, 0.055, sx * 0.25, 0.66 + 0.46 - 0.59, 0.0, skin, hd, 0.8)
    blob("thumb" + s, 0.03, 0.05, 0.03, sx * 0.25 - sx * 0.045, 0.66 + 0.46 - 0.58, -0.02, skin, hd, 0.8)

# ================================================================ BEAGLE (lokalnie przodem do +z)
tan = M("dogTan", 0xc07a3a, 0.8); dwhite = M("dogWhite", 0xf4efe6, 0.8); dblack = M("dogBlack", 0x24201d, 0.8)
dear = M("dogEar", 0x7a4322, 0.8); nose = M("dogNose", 0x111111, 0.3)
DX = 3.0   # model budowany obok postaci (strona i tak ustawia polozenie)
dr = empty("DOG_root", DX, 0, 0)
body = empty("pv_body", DX, 0, 0, dr)
blob("dogBody", 0.19, 0.18, 0.44, DX, 0.25, 0, tan, body, 0.8)
# czarna lata na grzbiecie (typowa dla beagle'a): skorupka dopasowana do zaokraglonego grzbietu, nie osobny klocek
def fur_patch(name, w, h, d, x, y, z, cut, mat, parent):
    o = blob(name, w, h, d, x, y, z, mat, parent, 0.8)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); o.data = me
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, cut), plane_no=(0, 0, 1), clear_inner=True)
    bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    return o
fur_patch("dogSaddle", 0.196, 0.186, 0.34, DX, 0.25, -0.03, 0.045, dblack, body)
blob("dogBelly", 0.16, 0.09, 0.36, DX, 0.19, 0.01, dwhite, body, 0.8)
blob("dogChest", 0.16, 0.15, 0.11, DX, 0.26, 0.2, dwhite, body, 0.8)
dneck = empty("pv_dneck", DX, 0.32, 0.2, body)
dhead = empty("pv_dhead", DX, 0.36, 0.25, dneck)
blob("dogHead", 0.15, 0.14, 0.15, DX, 0.36, 0.25, tan, dhead, 0.8)
blob("dogBlaze", 0.06, 0.12, 0.13, DX, 0.355, 0.27, dwhite, dhead, 0.8)
blob("dogMuzzle", 0.1, 0.085, 0.11, DX, 0.33, 0.35, dwhite, dhead, 0.8)
ball("dogNose", 0.024, DX, 0.355, 0.405, nose, dhead, (1, 0.8, 0.7))
for s, sx in (("L", -1), ("R", 1)):
    ball("dogEye" + s, 0.014, DX + sx * 0.045, 0.385, 0.325, nose, dhead)
    ep = empty("pv_dear_" + s, DX + sx * 0.08, 0.39, 0.24, dhead)
    blob("dogEar" + s, 0.03, 0.16, 0.085, DX + sx * 0.085, 0.31, 0.24, dear, ep, 0.8)
tail = empty("pv_tail", DX, 0.32, -0.2, body)
blob("dogTail", 0.035, 0.15, 0.035, DX, 0.39, -0.2, tan, tail, 0.9)
blob("dogTailTip", 0.042, 0.05, 0.042, DX, 0.47, -0.2, dwhite, tail, 0.9)
for i, (px, pz) in enumerate([(-0.06, 0.15), (0.06, 0.15), (-0.06, -0.15), (0.06, -0.15)]):
    lg = empty("pv_leg_%d" % i, DX + px, 0.19, pz, body)
    blob("dogLeg%d" % i, 0.055, 0.2, 0.055, DX + px, 0.1, pz, dwhite if i < 2 else tan, lg, 0.9)
    blob("dogPaw%d" % i, 0.065, 0.035, 0.075, DX + px, 0.015, pz + 0.01, dwhite, lg, 0.9)
# poza snu "w rogala"
curl = empty("DOG_curl", DX, 0, 0, dr)
R0, ARC = 0.12, math.pi * 1.55
ring("curlBody", R0, 0.072, ARC, DX, 0.075, 0, tan, curl, 0.0, 0.9)
ring("curlSaddle", R0 + 0.012, 0.06, ARC * 0.62, DX, 0.1, 0, dblack, curl, ARC * 0.18, 0.9)
ring("curlBelly", R0 - 0.03, 0.045, ARC * 0.9, DX, 0.05, 0, dwhite, curl, 0.0, 0.9)
def arcp(th): return (DX + R0 * math.cos(th), -R0 * math.sin(th))
hx, hz = arcp(ARC + 0.25)
blob("curlHead", 0.14, 0.12, 0.15, hx, 0.1, hz, tan, curl, 0.8, 2, rot=(0, ARC + 0.25 + math.pi, 0))
mx, mz = DX + (R0 - 0.02) * math.cos(ARC + 0.55), -(R0 - 0.02) * math.sin(ARC + 0.55)
blob("curlMuzzle", 0.09, 0.07, 0.09, mx, 0.08, mz, dwhite, curl, 0.8)
tx, tz = arcp(-0.05)
blob("curlTail", 0.04, 0.04, 0.16, tx + 0.04, 0.06, tz + 0.06, tan, curl, 0.9, 2, rot=(0, 0.9, 0))
blob("curlTailTip", 0.045, 0.045, 0.05, tx + 0.09, 0.06, tz + 0.12, dwhite, curl, 0.9)

# ================================================================ eksport
def export():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "actors.glb"), use_selection=True, export_format="GLB", export_yup=True,
                              export_apply=True, export_materials="EXPORT", export_draco_mesh_compression_enable=True,
                              export_draco_mesh_compression_level=7)
    print("EXPORTED", os.path.join(OUT, "actors.glb"))

if PREVIEW:
    cam = bpy.data.cameras.new("cam"); cam.lens = 60
    co = bpy.data.objects.new("cam", cam); scene.collection.objects.link(co); scene.camera = co
    co.location = V(1.6, 1.3, -2.4); co.rotation_euler = (V(1.4, 0.55, 0) - co.location).to_track_quat("-Z", "Y").to_euler()
    for nm, en, loc in (("key", 900, (2.5, 3, -3)), ("fill", 400, (-2, 2, -2))):
        d = bpy.data.lights.new(nm, "AREA"); d.energy = en; d.size = 2
        o = bpy.data.objects.new(nm, d); o.location = V(*loc); scene.collection.objects.link(o)
        o.rotation_euler = (V(1.5, 0.5, 0) - o.location).to_track_quat("-Z", "Y").to_euler()
    w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.4; scene.world = w
    scene.render.engine = "CYCLES"; scene.cycles.samples = 32; scene.cycles.device = "CPU"
    scene.render.resolution_x, scene.render.resolution_y = 900, 600; scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(co)
    for o in [o for o in scene.objects if o.type == "LIGHT"]: bpy.data.objects.remove(o)
export()
print("DONE")

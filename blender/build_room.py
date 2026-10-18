# Buduje pokoj CV w Blenderze (miekkie, oble meble), wypala oswietlenie (Cycles) i eksportuje dla strony.
# Uzycie:
#   blender --background --factory-startup --python blender/build_room.py -- --out <katalog> [--bake night|day|both|none]
#           [--res 4096] [--samples 128] [--preview plik.png] [--assets <katalog z modelami Poly Haven>]
# Uklad i wspolrzedne sa takie same jak w js/room.js (Three.js, Y w gore). Konwersja: three (x, y, z) -> blender (x, -z, y).
import bpy, bmesh, math, os, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = arg("--out", os.path.join(os.path.dirname(__file__), "out"))
BAKE = arg("--bake", "night")
RES = int(arg("--res", "4096"))
SAMPLES = int(arg("--samples", "128"))
PREVIEW = arg("--preview")
ASSETS = arg("--assets")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------------------------------------------------------------- pomocnicze
def V(x, y, z):            # three -> blender
    return Vector((x, -z, y))

def hexcol(h, a=1.0):
    r, g, b = ((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), a)

MATS = {}
def M(name, color, rough=0.6, metal=0.0, emit=None, strength=0.0):
    key = name
    if key in MATS: return MATS[key]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = hexcol(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit is not None:
        b.inputs["Emission Color"].default_value = hexcol(emit)
        b.inputs["Emission Strength"].default_value = strength
    MATS[key] = m
    return m

STATIC = []    # obiekty do wypalenia i polaczenia w jedna siatke
def link(obj, static=True):
    scene.collection.objects.link(obj)
    if static: STATIC.append(obj)
    return obj

def mesh_box(name, w, h, d):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * w, v.co.y * d, v.co.z * h))
    bm.to_mesh(me); bm.free()
    return me

def rbox(name, w, h, d, x, y, z, mat, bevel=0.02, segs=4, soft=0, rot=(0, 0, 0), static=True, parent=None):
    """Prostopadloscian w ukladzie three (w=x, h=y, d=z), polozony dolem na y. bevel = zaokraglenie, soft = poziom wygladzenia."""
    obj = bpy.data.objects.new(name, mesh_box(name, w, h, d))
    obj.location = V(x, y + h / 2, z)
    obj.rotation_euler = (rot[0], -rot[2], rot[1])
    obj.data.materials.append(mat)
    if bevel > 0:
        b = obj.modifiers.new("bevel", "BEVEL"); b.width = min(bevel, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4); b.segments = segs; b.limit_method = "NONE"
    if soft > 0:
        s = obj.modifiers.new("soft", "SUBSURF"); s.levels = soft; s.render_levels = soft
    for p in obj.data.polygons: p.use_smooth = True
    if parent: obj.parent = parent
    return link(obj, static)

def cyl(name, r1, r2, h, x, y, z, mat, segs=32, bevel=0.0, static=True, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=segs, radius1=r1, radius2=r2, depth=h, location=V(x, y + h / 2, z), rotation=(rot[0], -rot[2], rot[1]))
    obj = bpy.context.active_object; obj.name = name
    obj.data.materials.append(mat)
    if bevel > 0:
        b = obj.modifiers.new("bevel", "BEVEL"); b.width = bevel; b.segments = 3; b.limit_method = "ANGLE"
    for p in obj.data.polygons: p.use_smooth = True
    if static: STATIC.append(obj)
    return obj

def sph(name, r, x, y, z, mat, static=True, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=r, location=V(x, y, z))
    obj = bpy.context.active_object; obj.name = name; obj.scale = (scale[0], scale[2], scale[1])
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    if static: STATIC.append(obj)
    return obj

def torus(name, R, r, x, y, z, mat, static=True):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=48, minor_segments=16, location=V(x, y, z))
    obj = bpy.context.active_object; obj.name = name; obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    if static: STATIC.append(obj)
    return obj

def plane(name, w, h, x, y, z, facing="+z", static=False):
    """Plaska powierzchnia na tekstury dynamiczne (ekrany, zdjecia). facing = strona, w ktora patrzy (uklad three)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new(c) for c in [(-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0)]]
    f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.new("UVMap")
    for loop, c in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): loop[uv].uv = c
    bm.to_mesh(me); bm.free()
    obj = bpy.data.objects.new(name, me)
    obj.location = V(x, y, z)
    # plaszczyzna w ukladzie lokalnym XY (blender) = XZ? ustawiamy tak, by normalna wskazywala kierunek "facing" w three
    rots = {"+z": (math.pi / 2, 0, 0), "+x": (math.pi / 2, 0, math.pi / 2), "-z": (math.pi / 2, 0, math.pi), "-x": (math.pi / 2, 0, -math.pi / 2), "+y": (0, 0, 0)}
    obj.rotation_euler = rots[facing]
    return link(obj, static)

def apply_modifiers(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    obj.modifiers.clear()
    old = obj.data; obj.data = me
    if old.users == 0: bpy.data.meshes.remove(old)

# ---------------------------------------------------------------- materialy (paleta jak w js/util.js)
C = dict(wall=0x2b2f45, wallDark=0x23263a, base=0x1a1c2b, wood=0x8a5a3c, woodDark=0x5e3b27, deskTop=0x3a3e58,
         black=0x15161f, metal=0x8d93a8, white=0xeef0f6, cream=0xe9dfcc, purple=0x9b5cff, cyan=0x2de2e6, pink=0xff4fa3,
         warm=0xffc278, sofa=0x4b5577, sofaDark=0x3c4565, rug=0x3a3358, pot=0xd9cfc1, plant=0x3f8f5a)
mWall = M("wall", C["wall"], 0.9); mWall2 = M("wallDark", C["wallDark"], 0.9); mBase = M("base", C["base"], 0.8)
mBlack = M("black", C["black"], 0.45); mMetal = M("metalDark", 0x1b1d2b, 0.35, 0.6); mWhite = M("white", C["white"], 0.55)
mCream = M("cream", C["cream"], 0.6); mWood = M("wood", C["wood"], 0.55); mWoodD = M("woodDark", C["woodDark"], 0.55)
mDesk = M("deskTop", C["deskTop"], 0.5); mSofa = M("sofa", C["sofa"], 0.85); mSofaD = M("sofaDark", C["sofaDark"], 0.85)
mPurple = M("purple", C["purple"], 0.6); mCyan = M("cyan", C["cyan"], 0.6); mRug = M("rug", C["rug"], 0.95); mPot = M("pot", C["pot"], 0.7)

def floor_material():
    m = bpy.data.materials.new("floorPlanks"); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.55
    tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1, 1, 1)
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Color1"].default_value = hexcol(0x8a5c3e); br.inputs["Color2"].default_value = hexcol(0x7a4f34)
    br.inputs["Mortar"].default_value = hexcol(0x3a2418); br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.004; br.inputs["Brick Width"].default_value = 1.2; br.inputs["Row Height"].default_value = 0.16
    br.offset = 0.5; br.squash = 1.0
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 18
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"; mix.inputs[0].default_value = 0.25
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"]); nt.links.new(mp.outputs["Vector"], br.inputs["Vector"])
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nt.links.new(br.outputs["Color"], mix.inputs[6]); nt.links.new(nz.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    return m

# ---------------------------------------------------------------- pokoj
rbox("base", 6.5, 0.32, 6.5, -0.1, -0.42, -0.1, mBase, 0.08)
rbox("floor", 6.0, 0.1, 6.0, 0, -0.1, 0, floor_material(), 0.01, 2)
# tylna sciana z otworem na okno (x -2.6..-1.6, y 1.15..2.45)
for n, (w, h, x, y) in {"wallB1": (0.4, 3.2, -2.8, 0), "wallB2": (4.6, 3.2, 0.7, 0), "wallB3": (1.0, 1.15, -2.1, 0), "wallB4": (1.0, 0.75, -2.1, 2.45)}.items():
    rbox(n, w, h, 0.14, x, y, -3.07, mWall, 0.004, 1)
rbox("wallL", 0.14, 3.2, 6.14, -3.07, 0, 0, mWall2, 0.004, 1)
rbox("skirtB", 6.0, 0.1, 0.03, 0, 0, -2.99, mBlack, 0.01); rbox("skirtL", 0.03, 0.1, 6.0, -2.99, 0, 0, mBlack, 0.01)
# okno: nowoczesna, ciemna rama osadzona w glebi muru, drewniany parapet i zaslony; za oknem zawsze noc (SKY)
mFrame = M("winFrame", 0x1c1e2c, 0.4, 0.3)
for n, (w, h, x, y) in {"winT": (1.0, 0.05, -2.1, 2.4), "winB": (1.0, 0.05, -2.1, 1.15), "winL": (0.05, 1.3, -2.575, 1.15), "winR": (0.05, 1.3, -1.625, 1.15)}.items():
    rbox(n, w, h, 0.07, x, y, -3.1, mFrame, 0.01)
rbox("winV", 0.025, 1.22, 0.04, -2.1, 1.19, -3.1, mFrame, 0.008)
rbox("winH", 0.92, 0.025, 0.04, -2.1, 1.86, -3.1, mFrame, 0.008)
rbox("winHandle", 0.02, 0.1, 0.03, -2.06, 1.62, -3.06, M("metal", C["metal"], 0.35, 0.6), 0.008)
rbox("sill", 1.16, 0.045, 0.24, -2.1, 1.105, -2.97, mWood, 0.014)
cyl("sillPot", 0.055, 0.045, 0.09, -1.82, 1.15, -2.92, mPot, bevel=0.01)
sph("sillCandle", 0.03, -2.38, 1.18, -2.92, mCream)
for i, x in enumerate((-2.72, -1.48)):   # miekkie zaslony po bokach okna
    rbox("curtain%d" % i, 0.26, 2.15, 0.07, x, 0.62, -2.95, M("curtain", 0x3b3266, 0.95), 0.03, 3, 2)
rbox("curtainRod", 1.6, 0.025, 0.025, -2.1, 2.8, -2.94, M("metal", C["metal"], 0.35, 0.6), 0.012)
plane("SKY", 1.4, 1.6, -2.1, 1.8, -3.25, "+z")

# dywan
cyl("rug", 1.5, 1.5, 0.012, 0.9, 0.0, 0.2, mRug, segs=96, bevel=0.005)
bpy.ops.mesh.primitive_torus_add(major_radius=1.29, minor_radius=0.03, major_segments=96, minor_segments=8, location=V(0.9, 0.012, 0.2))
ring = bpy.context.active_object; ring.name = "rugRing"; ring.scale = (1, 1, 0.25); ring.data.materials.append(M("rugRing", 0x6b5fa0, 0.9)); STATIC.append(ring)

# ---------------------------------------------------------------- biurko
DX, DZ = -2.55, -0.7
rbox("deskTop", 0.9, 0.06, 2.1, DX, 0.72, DZ, mDesk, 0.025)
for i, (px, pz) in enumerate([(-0.38, -0.98), (0.38, -0.98), (-0.38, 0.98), (0.38, 0.98)]):
    rbox("deskLeg%d" % i, 0.06, 0.72, 0.06, DX + px, 0, DZ + pz, mBlack, 0.02)
rbox("deskMat", 0.42, 0.01, 0.95, DX + 0.15, 0.78, DZ - 0.08, M("deskMat", 0x3b2a66, 0.9), 0.004)
rbox("keyboard", 0.18, 0.025, 0.46, DX + 0.16, 0.79, DZ - 0.02, mBlack, 0.01)
rbox("mouse", 0.08, 0.03, 0.05, DX + 0.18, 0.79, DZ - 0.43, mBlack, 0.014, 4, 1)
# monitor glowny i boczny (ekrany jako plaszczyzny dynamiczne)
MX = DX - 0.22
rbox("monMainBase", 0.18, 0.02, 0.26, MX, 0.78, DZ - 0.1, mBlack, 0.008)
rbox("monMainStand", 0.04, 0.35, 0.05, MX, 0.78, DZ - 0.1, mBlack, 0.012)
rbox("monMain", 0.05, 0.6, 1.0, MX + 0.01, 0.95, DZ - 0.1, mBlack, 0.02)
plane("SCREEN_main", 0.94, 0.56, MX + 0.04, 1.25, DZ - 0.1, "+x")
side = (DX - 0.12, DZ + 0.72)
rbox("monSideBase", 0.16, 0.02, 0.2, side[0], 0.78, side[1], mBlack, 0.008, rot=(0, 0.55, 0))
rbox("monSide", 0.05, 0.86, 0.52, side[0] + 0.01, 0.9, side[1], mBlack, 0.02, rot=(0, 0.55, 0))
p = plane("SCREEN_side", 0.48, 0.79, side[0] + 0.04 * math.cos(0.55), 1.33, side[1] - 0.04 * math.sin(0.55), "+x"); p.rotation_euler[2] += 0.55
# kubek
cyl("mug", 0.045, 0.04, 0.1, DX + 0.18, 0.75, DZ + 0.55, mPurple, bevel=0.008)
# sluchawki na stojaku
cyl("hpBase", 0.05, 0.06, 0.02, DX + 0.05, 0.75, DZ + 0.95, mBlack, bevel=0.005)
cyl("hpRod", 0.012, 0.012, 0.28, DX + 0.05, 0.77, DZ + 0.95, M("metal", C["metal"], 0.35, 0.6))
bpy.ops.mesh.primitive_torus_add(major_radius=0.08, minor_radius=0.014, major_segments=32, minor_segments=10, location=V(DX + 0.05, 1.05, DZ + 0.95), rotation=(0, math.pi / 2, 0))
hb = bpy.context.active_object; hb.name = "hpBand"; hb.data.materials.append(mBlack); STATIC.append(hb)
for s in (-1, 1): rbox("hpCup%d" % s, 0.05, 0.08, 0.05, DX + 0.05, 0.95, DZ + 0.95 + s * 0.08, mPurple, 0.02, 4, 1)
# PC pod biurkiem
rbox("pc", 0.42, 0.48, 0.22, -2.6, 0, -1.55, mBlack, 0.02)

# ---------------------------------------------------------------- fotel gamingowy (oparcie za plecami postaci, od strony +x)
CX, CZ = -1.95, -0.72
cyl("chairPost", 0.035, 0.045, 0.36, CX, 0.07, CZ, M("metal", C["metal"], 0.35, 0.6))
for i in range(5):
    a = i * 2 * math.pi / 5
    rbox("chairLeg%d" % i, 0.05, 0.035, 0.3, CX + math.sin(a) * 0.14, 0.04, CZ + math.cos(a) * 0.14, mBlack, 0.015, rot=(0, a, 0))
    sph("chairWheel%d" % i, 0.03, CX + math.sin(a) * 0.28, 0.03, CZ + math.cos(a) * 0.28, mBlack)
rbox("chairSeat", 0.52, 0.12, 0.54, CX, 0.42, CZ, mBlack, 0.05, 4, 1)
rbox("chairBack", 0.13, 0.82, 0.52, CX + 0.25, 0.5, CZ, mBlack, 0.06, 4, 1, rot=(0, 0, -0.14))
rbox("chairWingA", 0.16, 0.62, 0.1, CX + 0.25, 0.56, CZ - 0.26, mBlack, 0.045, 4, 1, rot=(0, 0, -0.14))
rbox("chairWingB", 0.16, 0.62, 0.1, CX + 0.25, 0.56, CZ + 0.26, mBlack, 0.045, 4, 1, rot=(0, 0, -0.14))
rbox("chairPillow", 0.09, 0.12, 0.3, CX + 0.33, 1.13, CZ, mPurple, 0.05, 4, 1)
for s in (-1, 1):
    rbox("chairArm%d" % s, 0.34, 0.05, 0.07, CX, 0.67, CZ + s * 0.3, mBlack, 0.025, 4, 1)
    cyl("chairArmPost%d" % s, 0.018, 0.018, 0.2, CX + 0.02, 0.48, CZ + s * 0.3, mBlack)

# ---------------------------------------------------------------- regal (cyber) z certyfikatami
SX, SZ = -2.8, -2.45
for i, y in enumerate([0, 0.55, 1.1, 1.65, 2.15]): rbox("shelf%d" % i, 0.36, 0.04, 0.86, SX, y, SZ, mMetal, 0.012)
rbox("shelfSideA", 0.36, 2.2, 0.04, SX, 0, SZ - 0.43, mMetal, 0.012); rbox("shelfSideB", 0.36, 2.2, 0.04, SX, 0, SZ + 0.43, mMetal, 0.012)
for i in range(11):
    h = 0.32 + (i * 7 % 5) * 0.03
    rbox("book%d" % i, 0.24, h, 0.055, SX, 0.04, SZ - 0.36 + i * 0.065, M("book%d" % (i % 3), [0x23263a, 0x2e1f48, 0x1f3046][i % 3], 0.7), 0.01)
CERT_POS = [(0.59, -0.2), (0.59, 0.2), (1.14, -0.2), (1.14, 0.2), (1.69, 0)]
for i, (y, z) in enumerate(CERT_POS):
    rbox("certFrame%d" % i, 0.03, 0.32, 0.38, SX + 0.02, y, SZ + z, M("certFrame", 0x0d0f1c, 0.4, 0.5), 0.006, rot=(0, 0, 0.12))
    p = plane("CERT_%d" % i, 0.33, 0.24, SX + 0.04 + 0.16 * math.sin(0.12), y + 0.16, SZ + z, "+x"); p.rotation_euler[0] += 0.0; p.rotation_euler[1] = -0.12
cyl("holoBase", 0.07, 0.08, 0.03, SX, 1.69, SZ + 0.32, mMetal)

# ---------------------------------------------------------------- tablica (Miro)
rbox("boardFrame", 1.66, 1.06, 0.04, -0.5, 1.24, -2.98, M("boardFrame", 0xd8dbe4, 0.4, 0.4), 0.012)
plane("BOARD", 1.6, 0.995, -0.5, 1.77, -2.957, "+z")
rbox("boardTray", 1.2, 0.04, 0.08, -0.5, 1.2, -2.94, M("boardFrame", 0xd8dbe4, 0.4, 0.4), 0.012)
for i, col in enumerate([0x4262ff, 0xff4f8b, 0x00b37e]):
    rbox("marker%d" % i, 0.12, 0.024, 0.024, -0.9 + i * 0.1, 1.24, -2.93, M("marker%d" % i, col, 0.5), 0.011)

# ---------------------------------------------------------------- TV + szafka + konsola z kartridzami
# TV odsuniety od sciany - miejsce na miekka poswiate LED z tylu
rbox("tvBody", 1.9, 1.1, 0.06, 1.8, 1.12, -2.86, mBlack, 0.02)
rbox("tvMount", 0.4, 0.3, 0.1, 1.8, 1.52, -2.95, mBlack, 0.02)
plane("SCREEN_tv", 1.8, 1.0, 1.8, 1.67, -2.824, "+z")
rbox("media", 2.0, 0.42, 0.42, 1.8, 0.06, -2.72, mWood, 0.05)
for i, x in enumerate((-0.5, 0.5)): rbox("mediaDoor%d" % i, 0.9, 0.3, 0.02, 1.8 + x, 0.12, -2.51, mWoodD, 0.008)
for i, x in enumerate((-0.85, 0.85)): cyl("mediaFoot%d" % i, 0.025, 0.02, 0.06, 1.8 + x, 0, -2.72, mBlack)
rbox("soundbar", 0.9, 0.07, 0.1, 2.1, 0.48, -2.77, mBlack, 0.03)
rbox("console", 0.42, 0.08, 0.28, 1.25, 0.48, -2.7, mWhite, 0.03)
rbox("cartStand", 0.66, 0.03, 0.14, 1.78, 0.48, -2.62, mBlack, 0.01)
for i in range(3):
    a = -0.12 + i * 0.12
    rbox("cart%d" % i, 0.19, 0.26, 0.04, 1.56 + i * 0.22, 0.51, -2.62, M("cartBody", 0x2a2a35, 0.5), 0.012, rot=(-0.12, a, 0))
    p = plane("CART_%d" % i, 0.165, 0.103, 1.56 + i * 0.22 + 0.021 * math.sin(a), 0.51 + 0.15, -2.62 + 0.021 * math.cos(a), "+z"); p.rotation_euler[2] = a
# polka nad TV z figurkami
rbox("tvShelf", 0.9, 0.04, 0.2, 1.8, 2.42, -2.9, mWoodD, 0.012)
cyl("tvShelfPot", 0.09, 0.07, 0.14, 1.45, 2.46, -2.88, mPot, bevel=0.01)
rbox("figA", 0.1, 0.14, 0.08, 2.0, 2.46, -2.9, M("gold", 0xf2c14e, 0.35, 0.6), 0.03, 4, 1)
rbox("figB", 0.08, 0.1, 0.08, 2.25, 2.46, -2.9, mPurple, 0.03, 4, 1)

# ---------------------------------------------------------------- sciana zdjec (logo firm)
PHOTOS = [(2.05, 1.5, 0.5), (2.05, 0.95, 0.4), (2.05, 2.05, 0.4), (1.38, 1.22, 0.4), (1.38, 1.78, 0.4)]
for i, (y, z, w) in enumerate(PHOTOS):
    h = w * 1.25
    rbox("photoFrame%d" % i, 0.04, h + 0.06, w + 0.06, -2.98, y - (h + 0.06) / 2, z, mWhite if i == 0 else mBlack, 0.012)
    plane("PHOTO_%d" % i, w, h, -2.958, y, z, "+x")

# ---------------------------------------------------------------- sofa (pufiasta)
FX, FZ = 1.4, 1.05
rbox("sofaBase", 1.92, 0.22, 0.86, FX, 0.07, FZ, mSofaD, 0.07, 4, 1)
for i, x in enumerate((-0.42, 0.42)):
    rbox("sofaSeat%d" % i, 0.82, 0.17, 0.62, FX + x, 0.27, FZ - 0.06, mSofa, 0.07, 4, 2)
    rbox("sofaBack%d" % i, 0.82, 0.44, 0.22, FX + x, 0.3, FZ + 0.3, mSofa, 0.09, 4, 2, rot=(0.14, 0, 0))
for i, x in enumerate((-0.87, 0.87)): rbox("sofaArm%d" % i, 0.2, 0.42, 0.86, FX + x, 0.07, FZ, mSofaD, 0.09, 4, 2)
for i, (px, pz) in enumerate([(-0.8, -0.34), (0.8, -0.34), (-0.8, 0.34), (0.8, 0.34)]): cyl("sofaFoot%d" % i, 0.028, 0.02, 0.07, FX + px, 0, FZ + pz, mWoodD)
rbox("pillowA", 0.36, 0.32, 0.13, FX - 0.55, 0.42, FZ + 0.18, mPurple, 0.08, 4, 2, rot=(-0.2, 0, 0.18))
rbox("pillowB", 0.34, 0.3, 0.13, FX + 0.6, 0.42, FZ + 0.18, mCyan, 0.08, 4, 2, rot=(-0.2, 0, -0.14))
rbox("blanket", 0.66, 0.03, 0.5, FX + 0.12, 0.44, FZ - 0.08, M("blanket", 0xd9c3a5, 0.95), 0.014, 3, 1)

# ---------------------------------------------------------------- stolik kawowy z padem
TX, TZ = 1.3, -0.55
rbox("tableTop", 1.0, 0.07, 0.56, TX, 0.36, TZ, mCream, 0.03)
rbox("tableBody", 0.92, 0.2, 0.48, TX, 0.12, TZ, mWood, 0.04)
rbox("tableShelf", 0.92, 0.04, 0.48, TX, 0.06, TZ, mCream, 0.02)
for i, (px, pz) in enumerate([(-0.43, -0.22), (0.43, -0.22), (-0.43, 0.22), (0.43, 0.22)]): cyl("tableFoot%d" % i, 0.022, 0.022, 0.06, TX + px, 0, TZ + pz, mBlack)
rbox("pad", 0.2, 0.04, 0.11, TX + 0.15, 0.43, TZ + 0.05, mBlack, 0.02, 4, 1, rot=(0, 0.4, 0))
cyl("speaker", 0.05, 0.055, 0.09, TX - 0.3, 0.43, TZ - 0.08, M("speaker", 0x3a3e58, 0.5), bevel=0.02)

# ---------------------------------------------------------------- lampa lukowa przy kanapie (wlaczana na stronie)
LX, LZ = 2.66, 0.62
LAMP_HEAD = (2.12, 1.62, 0.92)      # srodek klosza (three)
mLampMetal = M("lampMetal", 0x2a2c3a, 0.35, 0.7)
cyl("lampBase", 0.17, 0.18, 0.035, LX, 0, LZ, mLampMetal, bevel=0.012)
cyl("lampPole", 0.016, 0.016, 1.35, LX, 0.03, LZ, mLampMetal, segs=16)
cu = bpy.data.curves.new("lampArc", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.014; cu.bevel_resolution = 4
sp_ = cu.splines.new("BEZIER"); sp_.bezier_points.add(1)
p0, p1 = sp_.bezier_points
p0.co = V(LX, 1.38, LZ); p0.handle_left = V(LX, 1.2, LZ); p0.handle_right = V(LX, 1.75, LZ)
p1.co = V(LAMP_HEAD[0], LAMP_HEAD[1] + 0.12, LAMP_HEAD[2]); p1.handle_left = V(LAMP_HEAD[0] + 0.25, LAMP_HEAD[1] + 0.32, LAMP_HEAD[2] - 0.1); p1.handle_right = V(LAMP_HEAD[0] - 0.1, LAMP_HEAD[1], LAMP_HEAD[2])
arc = bpy.data.objects.new("lampArc", cu); arc.data.materials.append(mLampMetal); link(arc)
bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=20, radius=0.17, location=V(*LAMP_HEAD))
shade = bpy.context.active_object; shade.name = "lampShade"; shade.scale = (1, 1, 0.62)
bm = bmesh.new(); bm.from_mesh(shade.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.02], context="VERTS"); bm.to_mesh(shade.data); bm.free()
sol = shade.modifiers.new("solid", "SOLIDIFY"); sol.thickness = 0.012
shade.data.materials.append(M("lampShade", 0xf1e6d2, 0.6))
for p in shade.data.polygons: p.use_smooth = True
STATIC.append(shade)
sph("lampBulb", 0.045, LAMP_HEAD[0], LAMP_HEAD[1] - 0.02, LAMP_HEAD[2], M("bulb", 0xfff4dc, 0.3))

# ---------------------------------------------------------------- legowisko psa (miedzy biurkiem a roslina)
DBX, DBZ = -2.42, 1.2
bpy.ops.mesh.primitive_torus_add(major_radius=0.3, minor_radius=0.1, major_segments=48, minor_segments=20, location=V(DBX, 0.09, DBZ))
bed = bpy.context.active_object; bed.name = "dogBed"; bed.scale = (1, 1.15, 0.85); bed.data.materials.append(M("dogBed", 0x5b4b8a, 0.95))
for p in bed.data.polygons: p.use_smooth = True
STATIC.append(bed)
cyl("dogBedCushion", 0.3, 0.3, 0.07, DBX, 0.0, DBZ, M("dogCushion", 0xe2d6c3, 0.95), segs=48, bevel=0.03)
rbox("dogToy", 0.12, 0.04, 0.04, DBX + 0.32, 0.0, DBZ - 0.32, M("toy", 0xff4fa3, 0.6), 0.02, 4, 1, rot=(0, 0.6, 0))

# ---------------------------------------------------------------- miska psa pod kwiatkiem
rbox("bowlMat", 0.5, 0.012, 0.3, 0.04, 0, -2.64, M("bowlMat", 0xd9cfc1, 0.9), 0.005)
torus("bowl", 0.1, 0.035, -0.07, 0.045, -2.66, M("bowlRed", 0xe85d4a, 0.5))
cyl("bowlFood", 0.085, 0.085, 0.01, -0.07, 0.035, -2.66, M("food", 0x7a4a2a, 0.9))
torus("bowl2", 0.07, 0.026, 0.15, 0.034, -2.64, M("bowlBlue", 0x3f86c6, 0.5))

# ---------------------------------------------------------------- wsporniki neonu i lampki (same swiecace czesci dodaje strona)
plane("NEON", 2.1, 0.41, -2.975, 2.45, -0.7, "+x")
rbox("neonBack", 0.01, 0.46, 2.2, -2.99, 2.22, -0.7, M("acrylic", 0x202236, 0.2), 0.004)

# ---------------------------------------------------------------- rosliny z Poly Haven (CC0)
def import_gltf(path, name, height, x, y, z, yaw=0.0):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    meshes = [o for o in new if o.type == "MESH"]
    for o in new:
        if o.name in bpy.context.collection.objects and o.name not in scene.collection.objects: pass
    # wymiary calosci
    bpy.context.view_layer.update()
    mins = Vector((1e9, 1e9, 1e9)); maxs = Vector((-1e9, -1e9, -1e9))
    for o in meshes:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c); mins = Vector(map(min, mins, w)); maxs = Vector(map(max, maxs, w))
    k = height / max(1e-6, maxs.z - mins.z)
    root = bpy.data.objects.new(name, None); scene.collection.objects.link(root)
    for o in new:
        if o.parent is None: o.parent = root
    root.scale = (k, k, k)
    cx, cy = (mins.x + maxs.x) / 2, (mins.y + maxs.y) / 2
    root.location = V(x, y, z) - Vector((cx * k, cy * k, mins.z * k))
    root.rotation_euler[2] = yaw
    bpy.context.view_layer.update()
    for o in meshes:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
        o.name = "PROP_" + name + "_" + o.name
        # uproszczenie siatki (liscie maja duzo wielokatow)
        d = o.modifiers.new("dec", "DECIMATE"); d.ratio = 0.35
        PROPS.append(o)
    return meshes
PROPS = []   # modele z Poly Haven: osobny eksport z wlasnymi teksturami (nie trafiaja do atlasu)

if ASSETS and os.path.isdir(ASSETS):
    pp = lambda n: os.path.join(ASSETS, n, n + ".gltf")
    if os.path.exists(pp("potted_plant_02")):
        import_gltf(pp("potted_plant_02"), "plantBig", 1.25, -2.55, 0, 2.55, 0.4)
        import_gltf(pp("potted_plant_02"), "plantBowl", 0.85, 0.56, 0, -2.62, 1.6)
    if os.path.exists(pp("potted_plant_04")):
        import_gltf(pp("potted_plant_04"), "succulent", 0.22, -2.35, 1.11, -2.88, 0.0)
    if os.path.exists(pp("desk_lamp_arm_01")):
        import_gltf(pp("desk_lamp_arm_01"), "deskLamp", 0.62, DX - 0.3, 0.75, DZ + 0.88, 2.4)

# ---------------------------------------------------------------- swiatla do wypalenia
def area(name, energy, color, size, x, y, z, tx, ty, tz, shape="RECTANGLE", sy=None):
    d = bpy.data.lights.new(name, "AREA"); d.energy = energy; d.color = hexcol(color)[:3]; d.shape = shape; d.size = size
    if sy: d.size_y = sy
    o = bpy.data.objects.new(name, d); o.location = V(x, y, z); scene.collection.objects.link(o)
    direction = V(tx, ty, tz) - o.location
    o.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return o
def point(name, energy, color, r, x, y, z):
    d = bpy.data.lights.new(name, "POINT"); d.energy = energy; d.color = hexcol(color)[:3]; d.shadow_soft_size = r
    o = bpy.data.objects.new(name, d); o.location = V(x, y, z); scene.collection.objects.link(o); return o
def sun(name, energy, color, rx, rz):
    d = bpy.data.lights.new(name, "SUN"); d.energy = energy; d.color = hexcol(color)[:3]; d.angle = 0.08
    o = bpy.data.objects.new(name, d); o.rotation_euler = (rx, 0, rz); scene.collection.objects.link(o); return o

def world(color, strength):
    w = bpy.data.worlds.new("world"); w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = hexcol(color); bg.inputs["Strength"].default_value = strength
    scene.world = w

def common_night(k):
    """Swiatla nocne wspolne dla obu wersji (k = sila; przy zgaszonej lampie LED-y i ekrany sa wyrazniejsze)."""
    area("ledDesk", 120 * k, 0x9b5cff, 1.6, -2.85, 1.6, -0.7, -3.1, 1.6, -0.7, sy=0.25)
    area("ledTv", 300 * k, 0x2de2e6, 1.7, 1.8, 1.67, -2.9, 1.8, 1.67, -3.3, sy=0.9)
    area("tvGlow", 70 * k, 0x8fe9ff, 1.6, 1.8, 1.65, -2.75, 1.8, 0.8, 0.5, sy=0.9)
    area("screens", 35 * k, 0xbcd8ff, 0.8, -2.65, 1.25, -0.6, -1.5, 1.0, -0.6, sy=0.5)
    area("neon", 55 * k, 0xd28cff, 2.0, -2.9, 2.45, -0.7, -1.0, 2.0, -0.7, sy=0.3)
    area("shelfLed", 45 * k, 0x2de2e6, 0.8, -2.55, 1.1, -2.45, -2.9, 1.1, -2.45, sy=2.0)
    point("deskLamp", 25, 0xffb46b, 0.08, -2.62, 1.18, 0.2)
    area("moon", 140, 0x8fa6ff, 1.0, -2.1, 1.8, -3.6, -1.5, 0.0, -1.0, sy=1.3)

def lights_on():
    """Lampa przy kanapie wlaczona: cieple, przytulne swiatlo w calym pokoju."""
    world(0x1a1d3a, 0.3)
    common_night(1.0)
    point("floorLamp", 160, 0xffc58a, 0.12, LAMP_HEAD[0], LAMP_HEAD[1] - 0.06, LAMP_HEAD[2])
    area("lampDown", 140, 0xffc58a, 0.5, LAMP_HEAD[0], LAMP_HEAD[1] - 0.1, LAMP_HEAD[2], LAMP_HEAD[0], 0, LAMP_HEAD[2])
    area("keyWarm", 220, 0xffd2a1, 2.8, 0.6, 3.6, 0.6, 0.4, 0, 0.0, sy=2.8)
    area("fill", 180, 0x9aa8ff, 4.0, 5, 4, 5, 0, 1, 0)

def lights_off():
    """Lampa zgaszona: pokoj oswietlaja tylko neony, LED-y, ekrany, lampka na biurku i ksiezyc."""
    world(0x141733, 0.22)
    common_night(1.5)
    area("fill", 70, 0x8a96e8, 4.0, 5, 4, 5, 0, 1, 0)

def lights_night():
    world(0x1a1d3a, 0.35)
    area("keyWarm", 520, 0xffd2a1, 2.8, 0.6, 3.6, 0.6, 0.4, 0, 0.0, sy=2.8)                 # cieple swiatlo z gory (sufit)
    area("ledDesk", 120, 0x9b5cff, 1.6, -2.85, 1.6, -0.7, -3.1, 1.6, -0.7, sy=0.25)         # fioletowa poswiata za monitorami
    area("ledTv", 300, 0x2de2e6, 1.7, 1.8, 1.67, -2.9, 1.8, 1.67, -3.3, sy=0.9)             # cyjanowa poswiata za TV na scianie
    area("tvGlow", 60, 0x8fe9ff, 1.6, 1.8, 1.65, -2.75, 1.8, 0.8, 0.5, sy=0.9)              # swiatlo z ekranu TV na pokoj
    area("screens", 30, 0xbcd8ff, 0.8, -2.65, 1.25, -0.6, -1.5, 1.0, -0.6, sy=0.5)          # monitory
    area("neon", 40, 0xd28cff, 2.0, -2.9, 2.45, -0.7, -1.0, 2.0, -0.7, sy=0.3)
    point("lamp", 25, 0xffb46b, 0.08, -2.62, 1.18, 0.2)
    area("moon", 120, 0x8fa6ff, 1.0, -2.1, 1.8, -3.6, -1.5, 0.0, -1.0, sy=1.3)
    area("fill", 220, 0x9aa8ff, 4.0, 5, 4, 5, 0, 1, 0)                                        # delikatne doswietlenie od strony widza

def lights_day():
    world(0xb8d4ff, 1.2)
    sun("sun", 4.0, 0xfff1dc, math.radians(48), math.radians(-32))
    area("skyWindow", 300, 0xcfe4ff, 1.0, -2.1, 1.8, -3.5, -1.5, 0.5, -1.0, sy=1.3)
    area("keyWarm", 180, 0xfff0d8, 3.0, 0.6, 3.6, 0.6, 0.4, 0, 0, sy=3.0)
    area("fill", 160, 0xdfe6ff, 4.0, 5, 4, 5, 0, 1, 0)
    area("ledTv", 70, 0x2de2e6, 1.7, 1.8, 1.67, -2.9, 1.8, 1.67, -3.3, sy=0.9)
    area("ledDesk", 30, 0x9b5cff, 1.6, -2.85, 1.6, -0.7, -3.1, 1.6, -0.7, sy=0.25)

def clear_lights():
    for o in list(scene.objects):
        if o.type == "LIGHT": bpy.data.objects.remove(o, do_unlink=True)

# ---------------------------------------------------------------- render podgladu (kamera jak w Three.js)
def setup_cycles(samples):
    scene.render.engine = "CYCLES"; scene.cycles.device = "CPU"; scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "AgX"; scene.view_settings.look = "AgX - Base Contrast"

def preview(path):
    cam = bpy.data.cameras.new("cam"); cam.lens_unit = "FOV"; cam.sensor_fit = "VERTICAL"; cam.angle = math.radians(32)
    co = bpy.data.objects.new("cam", cam); scene.collection.objects.link(co); scene.camera = co
    co.location = V(7.4, 5.7, 7.4)
    co.rotation_euler = (V(-0.1, 1.05, -0.1) - co.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.resolution_x, scene.render.resolution_y = 1280, 800
    setup_cycles(64); scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(co, do_unlink=True)

# ---------------------------------------------------------------- przygotowanie do wypalenia: jedna siatka, wspolne UV
def build_baked_mesh():
    for o in STATIC: apply_modifiers(o) if o.type == "MESH" and o.modifiers else None
    bpy.ops.object.select_all(action="DESELECT")
    meshes = [o for o in STATIC if o.type in ("MESH", "CURVE")]   # krzywe (luk lampy) zamieniane na siatke
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.make_single_user(object=True, obdata=True)
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    room = bpy.context.active_object; room.name = "ROOM_BAKED"
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # usuwamy sciany nigdy niewidoczne z kamery: spody (kamera jest zawsze nad podloga) i zewnetrzne strony scian
    bm = bmesh.new(); bm.from_mesh(room.data); bm.normal_update()
    drop = [f for f in bm.faces if f.normal.z < -0.7
            or (f.normal.y > 0.7 and f.calc_center_median().y > 3.08)
            or (f.normal.x < -0.7 and f.calc_center_median().x < -3.08)]
    bmesh.ops.delete(bm, geom=drop, context="FACES")
    bm.to_mesh(room.data); bm.free()
    print("REMOVED_HIDDEN_FACES", len(drop))
    uv = room.data.uv_layers.new(name="bake")
    room.data.uv_layers.active = uv
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.0015, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.uv.average_islands_scale()          # rowna gestosc pikseli na metr
    bpy.ops.uv.pack_islands(margin=0.0012, rotate=True, shape_method="CONCAVE")
    bpy.ops.object.mode_set(mode="OBJECT")
    return room

def bake(room, label):
    img = bpy.data.images.new("bake_" + label, RES, RES, alpha=False, float_buffer=True)
    for slot in room.material_slots:
        m = slot.material
        if not m: continue
        m.use_nodes = True
        n = m.node_tree.nodes.new("ShaderNodeTexImage"); n.image = img; n.name = "BAKE_TARGET"
        m.node_tree.nodes.active = n
    setup_cycles(SAMPLES)
    scene.cycles.bake_type = "DIFFUSE"
    scene.render.bake.use_pass_direct = True; scene.render.bake.use_pass_indirect = True; scene.render.bake.use_pass_color = True
    scene.render.bake.margin = 6; scene.render.bake.target = "IMAGE_TEXTURES"
    bpy.ops.object.select_all(action="DESELECT"); room.select_set(True); bpy.context.view_layer.objects.active = room
    bpy.ops.object.bake(type="DIFFUSE")
    # odszumianie wypalonej tekstury przez kompozytor (OIDN)
    path = os.path.join(OUT, "bake_%s.png" % label)
    img.filepath_raw = path; img.file_format = "PNG"; img.save()
    denoise(path)
    for slot in room.material_slots:
        if slot.material and "BAKE_TARGET" in slot.material.node_tree.nodes:
            slot.material.node_tree.nodes.remove(slot.material.node_tree.nodes["BAKE_TARGET"])
    print("BAKED", label, path)

def denoise(path):
    """Odszumianie wypalonej tekstury filtrem Denoise (OIDN) w kompozytorze; wynik: *_dn.png."""
    try:
        sc = bpy.data.scenes.new("denoise")
        sc.render.resolution_x = RES; sc.render.resolution_y = RES; sc.render.resolution_percentage = 100
        sc.view_settings.view_transform = "Standard"
        tree = bpy.data.node_groups.new("denoise", "CompositorNodeTree")
        sc.compositing_node_group = tree
        tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        im = tree.nodes.new("CompositorNodeImage"); im.image = bpy.data.images.load(path, check_existing=False)
        dn = tree.nodes.new("CompositorNodeDenoise")
        out = tree.nodes.new("NodeGroupOutput")
        tree.links.new(im.outputs[0], dn.inputs[0]); tree.links.new(dn.outputs[0], out.inputs[0])
        sc.render.filepath = path[:-4] + "_dn.png"; sc.render.image_settings.file_format = "PNG"
        with bpy.context.temp_override(scene=sc):
            bpy.ops.render.render(write_still=True, scene=sc.name)
        print("DENOISED", sc.render.filepath)
    except Exception as e:
        print("DENOISE_FAILED", repr(e))
# ---------------------------------------------------------------- eksport
def export(room):
    # siatka pokoju: tylko UV "bake", bez materialow (strona naklada wypalona teksture)
    for uv in list(room.data.uv_layers):
        if uv.name != "bake": room.data.uv_layers.remove(uv)
    room.data.materials.clear()
    keep = [room] + [o for o in scene.objects if o.type == "MESH" and o.name.split("_")[0] in ("SCREEN", "CERT", "PHOTO", "CART", "BOARD", "NEON", "SKY")]
    bpy.ops.object.select_all(action="DESELECT")
    for o in keep: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "room.glb"), use_selection=True, export_format="GLB", export_yup=True,
                              export_materials="NONE", export_texcoords=True, export_normals=False, export_apply=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
    print("EXPORTED", os.path.join(OUT, "room.glb"))
    # rosliny i lampka: osobny plik z wlasnymi materialami (oswietla je strona)
    if PROPS:
        # lekkie materialy: tylko tekstura koloru 512 px (bez map normalnych i szorstkosci)
        for o in PROPS:
            for slot in o.material_slots:
                m = slot.material
                if not m or not m.node_tree: continue
                b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
                if not b: continue
                for inp in ("Normal", "Roughness", "Metallic"):
                    for l in list(b.inputs[inp].links): m.node_tree.links.remove(l)
                b.inputs["Roughness"].default_value = 0.75
                for n in m.node_tree.nodes:
                    if n.type == "TEX_IMAGE" and n.image and max(n.image.size) > 512:
                        n.image.scale(512, 512)
        bpy.ops.object.select_all(action="DESELECT")
        for o in PROPS: o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "props.glb"), use_selection=True, export_format="GLB", export_yup=True,
                                  export_apply=True, export_image_format="JPEG", export_image_quality=82, export_draco_mesh_compression_enable=True,
                                  export_draco_mesh_compression_level=7)
        print("EXPORTED", os.path.join(OUT, "props.glb"))

def glow_placeholders():
    """Na czas renderu/wypalania: ekrany i neon swieca (rzucaja poswiate), zdjecia i certyfikaty sa matowe."""
    looks = {"SCREEN": (0x7fa8ff, 3.0), "NEON": (0xd28cff, 6.0), "SKY": (0x2a3a7a, 1.5), "BOARD": (0xf2f3f6, 0.6),
             "CERT": (0x4a2e8a, 1.5), "PHOTO": (0xe8e8ee, 0.0), "CART": (0xc98a3a, 0.5)}
    for o in scene.objects:
        if o.type != "MESH": continue
        k = o.name.split("_")[0]
        if k in looks:
            col, s = looks[k]
            o.data.materials.clear(); o.data.materials.append(M("ph_" + k, col, 0.5, 0, col if s > 0 else None, s))

# ---------------------------------------------------------------- przebieg
glow_placeholders()
LIGHTS = {"on": lights_on, "off": lights_off, "night": lights_night, "day": lights_day}
if PREVIEW:
    LIGHTS[arg("--preview-light", "on")](); preview(PREVIEW)
if BAKE != "none":
    room = build_baked_mesh()
    for label in (["on", "off"] if BAKE == "both" else [BAKE]):
        clear_lights(); LIGHTS[label]()
        bake(room, label)
    export(room)
print("DONE")

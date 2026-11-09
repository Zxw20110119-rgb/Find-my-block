"""Run with Blender: blender -b -t 6 -P scripts/model-towers.py."""
import math
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector

OUT = Path(__file__).resolve().parents[1] / "public/assets/towers"
OUT.mkdir(parents=True, exist_ok=True)
FRAMES = 12
SIZE = 176

def srgb(code):
    def linear(x):
        return x / 12.92 if x < .04045 else ((x + .055) / 1.055) ** 2.4
    return [linear(int(code[i:i+2], 16) / 255) for i in (0, 2, 4)]

def material(name, color, metal=.25, rough=.35, glow=0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*srgb(color), 1)
    mat.use_nodes = True
    p = mat.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = mat.diffuse_color
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    p.inputs["Emission Color"].default_value = mat.diffuse_color
    p.inputs["Emission Strength"].default_value = glow
    return mat

def finish(obj, label, mat, bevel=.035):
    obj.name = label
    obj.data.materials.append(mat)
    if bevel:
        b = obj.modifiers.new("Machined edges", "BEVEL")
        b.width, b.segments = bevel, 3
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj

def box(label, loc, dim, mat, bevel=.055):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = dim
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, label, mat, bevel)

def cylinder(label, loc, r, depth, mat, vertices=32, axis=None, bevel=.025):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=depth, location=loc)
    obj = bpy.context.object
    if axis:
        obj.rotation_euler = Vector((0, 0, 1)).rotation_difference(Vector(axis)).to_euler()
    return finish(obj, label, mat, bevel)

def cone(label, loc, radius1, radius2, depth, mat, vertices=8, tilt=0):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=radius1, radius2=radius2, depth=depth, location=loc)
    obj = bpy.context.object
    obj.rotation_euler[1] = tilt
    return finish(obj, label, mat, .02)

def ring(label, loc, radius, tube, mat, axis=None):
    bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=10, location=loc, major_radius=radius, minor_radius=tube)
    obj = bpy.context.object
    if axis:
        obj.rotation_euler = Vector((0,0,1)).rotation_difference(Vector(axis)).to_euler()
    return finish(obj, label, mat, 0)

def base(accent, steel, dark, light, n=8):
    cylinder("Anchored chassis", (0,0,.11), .93, .22, dark, n)
    cylinder("Trim", (0,0,.23), .88, .10, accent, n)
    cone("Sloped armor", (0,0,.38), .85, .61, .24, steel, n)
    cylinder("Turret bearing", (0,0,.53), .57, .13, dark)
    ring("Power ring", (0,0,.59), .49, .026, light)
    for i in range(n):
        angle = i*2*math.pi/n
        cylinder("Steel fastener", (.78*math.cos(angle), .78*math.sin(angle), .307), .041, .04, steel, 6, bevel=.007)

def pulse():
    steel = material("Slate alloy","455969",.6)
    dark = material("Dark graphite","20333D",.48)
    accent = material("Teal enamel","0F8E71",.33)
    light = material("Ion green","72FFD0",.1,.25,.78)
    base(accent,steel,dark,light)
    cone("Swivel pedestal",(0,0,.76),.43,.31,.35,steel)
    box("Central motor",(0,-.02,1.04),(.77,.78,.42),accent)
    box("Upper armor",(0,-.14,1.33),(.58,.53,.19),steel)
    for x in (-.28,.28):
        box("Rail housing",(x,.31,1.12),(.32,.99,.31),dark)
        box("Conductive rail",(x,.39,1.285),(.21,.74,.041),light,.017)
        cylinder("Pulse emitter",(x,.91,1.13),.122,.25,steel,16,(0,1,0))
        ring("Emitter edge",(x,1.04,1.13),.09,.022,light,(0,1,0))
        cylinder("Lens",(x,1.043,1.13),.072,.022,dark,24,(0,1,0))
    cylinder("Sensor",(0,.24,1.43),.112,.09,light,16)

def frost():
    steel = material("Pearl blue armor","83A9BB",.55)
    dark = material("Dark blue frame","254452",.42)
    accent = material("Cryo blue","2972AF",.38)
    light = material("Ice channel","98EFFF",.12,.24,.73)
    crystal = material("Crystal facets","59CBFC",.17,.19,.23)
    base(accent,steel,dark,light,6)
    cylinder("Cryogenic compressor",(0,0,.73),.47,.28,accent,12)
    ring("Chamber seal",(0,0,.87),.42,.063,steel)
    ring("Chamber light",(0,0,.921),.35,.035,light)
    cone("Crystal lower cut",(0,0,1.12),.22,.32,.42,crystal,6)
    cylinder("Crystal core",(0,0,1.36),.32,.21,crystal,6)
    cone("Crystal tip",(0,0,1.65),.32,0,.43,crystal,6,tilt=.1)
    for i in range(5):
        a = i*2*math.pi/5
        x,y = math.cos(a), math.sin(a)
        cone("Cooling fin",(.48*x,.48*y,.94),.14,.095,.57,steel,4)
        cylinder("Cryo spindle",(.5*x,.5*y,1.2),.13,.18,dark,8)
        cone("Satellite crystal",(.48*x,.48*y,1.39),.14,0,.36,light,5)

def burst():
    steel = material("Steel armor","68717D",.65)
    dark = material("Launcher graphite","332D32",.52)
    accent = material("Safety orange","D37C28",.25)
    light = material("Hot amber","FFCA6C",.11,.23,.82)
    base(accent,steel,dark,light)
    box("Elevation yoke",(0,-.07,.78),(1.23,.89,.34),dark)
    box("Reactor pack",(0,-.48,1.17),(1.15,.43,.62),accent)
    for x in (-.59,.59):
        box("Hinged side armor",(x,-.02,1.13),(.20,1.02,.68),accent)
        cylinder("Hinge cap",(x*1.14,-.11,.93),.16,.067,steel,24,(1,0,0))
        box("Signal trim",(x,.06,1.495),(.128,.64,.038),light)
    for x,z in [(-.32,1.16),(.32,1.16),(0,1.50)]:
        cylinder("Blast tube",(x,.28,z),.222,1.12,steel,12,(0,1,0))
        cylinder("Tube sleeve",(x,.54,z),.235,.25,dark,12,(0,1,0))
        ring("Muzzle gasket",(x,.865,z),.173,.056,accent,(0,1,0))
        cylinder("Deep barrel",(x,.862,z),.148,.045,dark,24,(0,1,0))
        ring("Hot throat",(x,.891,z),.097,.022,light,(0,1,0))

def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z","Y").to_euler()

def area(name, loc, energy, color, size):
    lamp = bpy.data.lights.new(name, "AREA")
    lamp.energy, lamp.color, lamp.shape, lamp.size = energy, color, "DISK", size
    obj = bpy.data.objects.new(name, lamp)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    aim(obj,(0,0,.65))

def render(type_, build):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build()
    parts = list(bpy.context.scene.objects)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in parts:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT / (type_ + ".glb")), export_format="GLB",
                              use_selection=True, export_apply=True, export_yup=True)
    pivot = bpy.data.objects.new("Turntable",None)
    bpy.context.collection.objects.link(pivot)
    for obj in parts:
        obj.parent = pivot
    camera = bpy.data.cameras.new("Orthographic camera")
    camera.type, camera.ortho_scale = "ORTHO", 2.92
    cam = bpy.data.objects.new("Orthographic camera",camera)
    bpy.context.collection.objects.link(cam)
    cam.location = (0,-5.2,7.6)
    aim(cam,(0,0,.78))
    scene = bpy.context.scene
    scene.camera = cam
    area("Warm key",(-3, -4, 6),520,(1,.89,.76),4)
    area("Sky fill",(3,-1,5),400,(.55,.78,1),3.5)
    area("Rim",(0,4,4),650,(.63,1,.89),2.6)
    scene.world = bpy.data.worlds.new("Studio sky")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs[0].default_value = (.27,.31,.35,1)
    scene.world.node_tree.nodes.get("Background").inputs[1].default_value = .4
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = False
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "AgX"
    with tempfile.TemporaryDirectory() as tmp:
        frames = []
        for frame in range(FRAMES):
            pivot.rotation_euler.z = -frame * 2 * math.pi / FRAMES
            image = Path(tmp)/f"{frame:02}.png"
            scene.render.filepath = str(image)
            bpy.ops.render.render(write_still=True)
            frames.append(str(image))
        # Ship a compact sprite atlas generated directly from the exported mesh.
        import subprocess
        subprocess.run(["magick","montage",*frames,"-tile","4x3","-geometry","+0+0",
                        "-background","none","-quality","91",str(OUT/(type_+".webp"))],check=True)

for kind, build in [("pulse",pulse),("frost",frost),("burst",burst)]:
    render(kind, build)

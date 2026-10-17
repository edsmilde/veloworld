"""Generate six editable, lightweight tree variants and individual GLB assets."""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent / 'trees'
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*rgb, 1)
    node.inputs['Roughness'].default_value = .9
    return mat

bark = material('TreeBark', (.19, .095, .045))
pine_leaf = material('PineNeedles', (.055, .18, .095))
leaf = material('DeciduousLeaves', (.19, .34, .065))

def branch(a, b, radius, end_radius, mat, parts):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cone_add(vertices=9, radius1=radius, radius2=end_radius, depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(mat)
    parts.append(obj)

roots = []
for kind in ['pine', 'deciduous']:
    for variant in range(3):
        rng = random.Random(100 + variant + (0 if kind == 'pine' else 50))
        parts = []
        height = [6.5, 7.4, 5.7][variant] if kind == 'pine' else [5.4, 6.2, 5.1][variant]
        branch((0,0,0),(.06,-.03,height*.82),.19,.045,bark,parts)
        if kind == 'pine':
            width = [1.6, 1.35, 1.9][variant]
            for tier in range(7):
                z = 1.6 + tier*(height-2)/7
                radius = width*(1-tier*.115)
                for arm in range(6):
                    angle = arm*math.tau/6 + tier*.6 + rng.uniform(-.15,.15)
                    end = (math.cos(angle)*radius*.8, math.sin(angle)*radius*.8, z-.15)
                    branch((0,0,z+.15),end,.035,.008,bark,parts)
                bpy.ops.mesh.primitive_cone_add(vertices=13, radius1=radius, radius2=.03, depth=1.65, location=(rng.uniform(-.12,.12),rng.uniform(-.12,.12),z+.45))
                obj = bpy.context.object
                for v in obj.data.vertices:
                    if v.co.z < 0:
                        v.co.x *= rng.uniform(.86,1.13)
                        v.co.y *= rng.uniform(.86,1.13)
                        v.co.z += rng.uniform(-.16,.16)
                obj.data.materials.append(pine_leaf)
                parts.append(obj)
        else:
            width = [1.65,1.5,1.9][variant]
            for arm in range(10):
                angle = arm*2.4 + variant*.5
                radius = rng.uniform(.55,1.2)*width
                z = rng.uniform(height*.58,height*.88)
                tip = (math.cos(angle)*radius,math.sin(angle)*radius,z)
                branch((0,0,1.6+arm*.12),tip,.065,.018,bark,parts)
                bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=tip)
                obj = bpy.context.object
                obj.scale = (rng.uniform(.9,1.25),rng.uniform(.9,1.25),rng.uniform(.95,1.35))
                for v in obj.data.vertices: v.co *= rng.uniform(.9,1.1)
                obj.data.materials.append(leaf)
                parts.append(obj)
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1.25,location=(0,0,height-.7))
            obj=bpy.context.object
            obj.data.materials.append(leaf)
            parts.append(obj)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in parts: obj.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        tree = bpy.context.object
        tree.name = f'{kind}-{variant+1}'
        # All assets share a ground-level origin; game supplies placement/scale.
        bpy.context.scene.cursor.location = (0,0,0)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        bpy.ops.export_scene.gltf(filepath=str(OUT/f'{tree.name}.glb'),export_format='GLB',use_selection=True,export_animations=False)
        tree.location.x = (variant-1)*5
        tree.location.y = 0 if kind == 'pine' else -6
        roots.append(tree)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'tree-library.blend'))
floor_mat=material('StudioFloor',(.65,.68,.61))
bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.data.materials.append(floor_mat)
bpy.ops.object.camera_add(location=(12,-24,15))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,-2.5,3))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=21
scene=bpy.context.scene
scene.camera=camera
for loc,energy,size in [((0,-5,15),1800,10),((-8,3,10),1200,8)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    bpy.context.object.data.energy=energy
    bpy.context.object.data.size=size
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1400; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'tree-library-preview.png')
bpy.ops.render.render(write_still=True)

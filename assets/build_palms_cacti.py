"""Build three palms and three saguaros with editable, separate color materials."""
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
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = .85
    return mat

bark = material('PalmBark', (.32,.18,.085))
leaves = material('PalmFronds', (.07,.29,.10))
fruit = material('Coconuts', (.22,.12,.045))
green = material('CactusSkin', (.18,.32,.13))
rib = material('CactusRibs', (.25,.40,.17))

def tube(points, radius, mat, parts, ribs=False):
    vertices, faces = [], []
    sides = 24 if ribs else 10
    for i, point in enumerate(points):
        taper = 1 - .22*i/max(1,len(points)-1)
        tangent = (Vector(points[min(i+1,len(points)-1)]) - Vector(points[max(i-1,0)])).normalized()
        reference = Vector((0,1,0)) if abs(tangent.y) < .9 else Vector((1,0,0))
        u = reference.cross(tangent).normalized()
        v = tangent.cross(u).normalized()
        for j in range(sides):
            angle = j*math.tau/sides
            r = radius*taper*(1 if not ribs or j%2 == 0 else .87)
            vertices.append(Vector(point) + r*(u*math.cos(angle)+v*math.sin(angle)))
    for i in range(len(points)-1):
        for j in range(sides):
            faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
    faces.extend([tuple(reversed(range(sides))),tuple((len(points)-1)*sides+j for j in range(sides))])
    mesh=bpy.data.meshes.new('PlantSurface'); mesh.from_pydata(vertices,[],faces); mesh.update()
    obj=bpy.data.objects.new('PlantPart',mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    parts.append(obj)

def ball(point, scale, mat, parts):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,radius=1,location=point)
    obj=bpy.context.object; obj.scale=scale; obj.data.materials.append(mat); parts.append(obj)

def leaflet(a,b,width,parts):
    a,b=Vector(a),Vector(b)
    across=Vector((-(b-a).y,(b-a).x,0)).normalized()*width
    mid=a.lerp(b,.45)
    mesh=bpy.data.meshes.new('Leaflet')
    mesh.from_pydata([a,mid+across,mid+Vector((0,0,.06)),mid-across,b],[],[(0,1,2),(1,4,2),(4,3,2),(3,0,2)])
    mesh.update(); obj=bpy.data.objects.new('PalmLeaflet',mesh); bpy.context.collection.objects.link(obj)
    obj.data.materials.append(leaves); parts.append(obj)

for kind in ['palm','cactus']:
    for variant in range(3):
        rng=random.Random(800+variant)
        parts=[]
        if kind == 'palm':
            height=[6.0,7.0,5.2][variant]
            lean=[.65,-.45,1.0][variant]
            points=[(lean*(i/14)**2,0,height*i/14) for i in range(15)]
            tube(points,.22,bark,parts)
            for i in range(1,23):
                t=i/23
                bpy.ops.mesh.primitive_torus_add(major_radius=.22*(1-.22*t),minor_radius=.018,major_segments=10,minor_segments=4,location=(lean*t*t,0,height*t))
                obj=bpy.context.object; obj.data.materials.append(bark); parts.append(obj)
            crown=Vector(points[-1])
            for i in range(10):
                angle=i*math.tau/10+variant*.3
                direction=Vector((math.cos(angle),math.sin(angle),0))
                side=Vector((-math.sin(angle),math.cos(angle),0))
                length=rng.uniform(2.3,3.1)
                def center(t):
                    return crown+direction*length*t+Vector((0,0,.75*math.sin(math.pi*t)-.85*t*t))
                tube([center(j/12) for j in range(13)],.028,leaves,parts)
                for j in range(1,12):
                    t=j/12
                    width=.65*math.sin(math.pi*t)**.65
                    for sign in [-1,1]:
                        a=center(t)
                        b=a+side*sign*width+direction*.27+Vector((0,0,-.12))
                        leaflet(a,b,.075,parts)
            for i in range(4):
                angle=i*math.tau/4
                ball(crown+Vector((.2*math.cos(angle),.2*math.sin(angle),-.25)),(.16,.16,.21),fruit,parts)
        else:
            height=[3.7,4.6,3.1][variant]
            radius=[.30,.32,.36][variant]
            tube([(0,0,0),(0,0,height-.22)],radius,green,parts,True)
            ball((0,0,height-.22),(radius*.78,radius*.78,.25),green,parts)
            for arm in range([2,3,2][variant]):
                angle=arm*2.8+variant*.6
                direction=Vector((math.cos(angle),math.sin(angle),0))
                z=height*[.48,.65,.34][arm]
                reach=.72+arm*.12
                tip=z+[1.0,.75,1.25][arm]
                points=[Vector((0,0,z)),direction*(reach*.5)+Vector((0,0,z)),direction*reach+Vector((0,0,z+.22)),direction*reach+Vector((0,0,tip))]
                tube(points,.18,green,parts,True)
                ball(points[-1],(.14,.14,.19),green,parts)
            # Subtle raised vertical ribs catch light without dense spine geometry.
            for j in range(12):
                angle=j*math.tau/12
                x,y=radius*.98*math.cos(angle),radius*.98*math.sin(angle)
                tube([(x,y,.15),(x*.79,y*.79,height-.25)],.012,rib,parts)
        bpy.ops.object.select_all(action='DESELECT')
        for obj in parts: obj.select_set(True)
        bpy.context.view_layer.objects.active=parts[0]
        bpy.ops.object.join()
        obj=bpy.context.object; obj.name=f'{kind}-{variant+1}'
        bpy.context.scene.cursor.location=(0,0,0)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        bpy.ops.export_scene.gltf(filepath=str(OUT/f'{obj.name}.glb'),export_format='GLB',use_selection=True,export_animations=False)
        obj.location=((variant-1)*6,0 if kind=='palm' else -6,0)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'palms-cacti-library.blend'))
floor=material('StudioSand',(.59,.49,.33))
bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.data.materials.append(floor)
bpy.ops.object.camera_add(location=(11,-26,15))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,-2,3))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=24
scene=bpy.context.scene; scene.camera=camera
for loc,energy,size in [((0,-5,15),2100,10),((-8,3,10),1400,8)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    bpy.context.object.data.energy=energy; bpy.context.object.data.size=size
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1400; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'palms-cacti-preview.png')
bpy.ops.render.render(write_still=True)

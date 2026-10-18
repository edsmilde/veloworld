"""Three low-poly, editable grapevines with trellises and grape bunches."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent/'trees'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    shader=m.node_tree.nodes.get('Principled BSDF'); shader.inputs['Base Color'].default_value=(*color,1); shader.inputs['Roughness'].default_value=.85
    return m
bark=mat('GrapevineWood',(.24,.13,.05)); foliage=mat('GrapeLeaves',(.15,.32,.07)); posts=mat('TrellisPosts',(.39,.27,.14)); wire=mat('TrellisWire',(.22,.23,.20))
grapes=[mat('Grapes'+str(i),color) for i,color in enumerate([(.23,.055,.30),(.37,.11,.28),(.46,.57,.13)])]
parts=[]
def tube(a,b,r,m):
    a,b=Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r,radius2=r*.8,depth=(b-a).length,location=(a+b)/2)
    o=bpy.context.object; o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); o.data.materials.append(m); parts.append(o)
def ball(p,size,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p)
    o=bpy.context.object; o.scale=size; o.data.materials.append(m); parts.append(o)
for v in range(3):
    parts=[]; rng=random.Random(520+v); height=[1.8,1.95,1.7][v]
    tube((0,0,0),(.10,0,.65),.075,bark); tube((.10,0,.65),(-.05,0,1.1),.06,bark)
    for x in [-1.65,1.65]: tube((x,0,0),(x,0,height+.1),.045,posts)
    for z in [.85,1.35,height]: tube((-1.68,0,z),(1.68,0,z),.008,wire)
    for side in [-1,1]:
        tube((-.05,0,1.1),(side*1.4,0,1.2),.035,bark)
        for i in range(5):
            x=side*(.15+i*.28); tip=(x+rng.uniform(-.12,.12),rng.uniform(-.12,.12),height+rng.uniform(-.12,.12))
            tube((x,0,1.2),tip,.017,bark)
            ball(tip,(.39,.32,.25),foliage)
            for j in [-1,1]:
                ball((tip[0],j*.27,tip[2]-.22),(.30,.25,.12),foliage)
            if i%2==0:
                # Tapered hanging bunch, individual low-poly grapes.
                for layer in range(4):
                    count=5-layer
                    for g in range(count):
                        a=g*math.tau/count; radius=.10*(1-layer*.22)
                        ball((x+radius*math.cos(a),-.22+radius*math.sin(a),height-.43-layer*.085),(.058,.058,.065),grapes[v])
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); o=bpy.context.object; o.name=f'grape-{v+1}'
    bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{o.name}.glb'),export_format='GLB',use_selection=True,export_animations=False)
    o.location=((v-1)*4.7,0,0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'grapevine-library.blend'))
ground=mat('StudioGround',(.45,.39,.27)); bpy.ops.mesh.primitive_plane_add(size=100); bpy.context.object.data.materials.append(ground)
bpy.ops.object.camera_add(location=(6,-13,7)); camera=bpy.context.object; camera.rotation_euler=(Vector((0,0,.8))-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.type='ORTHO'; camera.data.ortho_scale=16
scene=bpy.context.scene; scene.camera=camera
for loc,energy,size in [((0,-4,10),1800,8),((-6,4,8),1000,6)]:
    bpy.ops.object.light_add(type='AREA',location=loc); bpy.context.object.data.energy=energy; bpy.context.object.data.size=size
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=1500; scene.render.resolution_y=800; scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'grapevine-preview.png'); bpy.ops.render.render(write_still=True)

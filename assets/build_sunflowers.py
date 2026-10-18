"""Three editable sunflower variants with layered petals, seeds and leaves."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
OUT=Path(__file__).resolve().parent/'trees'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=.85
    return m
stem=mat('SunflowerStem',(.15,.29,.055)); leaf=mat('SunflowerLeaves',(.13,.34,.06)); yellow=mat('SunflowerPetals',(.96,.63,.025)); gold=mat('SunflowerInnerPetals',(.86,.39,.01)); center=mat('SunflowerSeedHead',(.16,.065,.018)); seeds=mat('SunflowerSeeds',(.34,.18,.055))
parts=[]
def tube(a,b,r,m):
    a,b=Vector(a),Vector(b); bpy.ops.mesh.primitive_cone_add(vertices=8,radius1=r,radius2=r*.8,depth=(b-a).length,location=(a+b)/2)
    o=bpy.context.object; o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); o.data.materials.append(m); parts.append(o)
def ball(p,size,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=p); o=bpy.context.object; o.scale=size; o.data.materials.append(m); parts.append(o); return o
def blade(a,b,width):
    a,b=Vector(a),Vector(b); mid=a.lerp(b,.5); cross=Vector((-(b-a).y,(b-a).x,0)).normalized()*width
    mesh=bpy.data.meshes.new('Leaf'); mesh.from_pydata([a,mid+cross,mid+Vector((0,0,.07)),mid-cross,b],[],[(0,1,2),(1,4,2),(4,3,2),(3,0,2)]); mesh.update()
    o=bpy.data.objects.new('Leaf',mesh); bpy.context.collection.objects.link(o); o.data.materials.append(leaf); parts.append(o)
    tube(a,b,.008,stem)
for v in range(3):
    parts=[]; height=[2.1,2.55,1.75][v]; lean=[.12,-.16,.20][v]; head=Vector((lean,0,height))
    tube((0,0,0),(lean*.3,.02,height*.55),.028,stem); tube((lean*.3,.02,height*.55),head,.024,stem)
    for i in range(6):
        z=.35+i*(height-.7)/6; angle=i*2.4+v*.4; a=Vector((lean*z/height,0,z)); b=a+Vector((math.cos(angle)*.52,math.sin(angle)*.52,.15))
        blade(a,b,.18)
    radius=[.27,.30,.24][v]
    ball(head,(radius,.10,radius),center)
    # Heads face Blender -Y, so the petals lie in the XZ plane.
    for layer in range(2):
        for i in range(19):
            angle=i*math.tau/19+layer*.14
            p=head+Vector((math.sin(angle)*(radius+.14),-.025-layer*.025,math.cos(angle)*(radius+.14)))
            o=ball(p,(.075,.035,.25 if layer==0 else .19),yellow if layer==0 else gold); o.rotation_euler.y=angle
    for i in range(65):
        r=radius*.90*math.sqrt((i+.5)/65); angle=i*2.39996
        ball(head+Vector((r*math.cos(angle),-.10,r*math.sin(angle))),(.019,.014,.019),seeds)
    # Green calyx behind the bloom.
    ball(head+Vector((0,.09,0)),(radius*.75,.06,radius*.75),stem)
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); o=bpy.context.object; o.name=f'sunflower-{v+1}'
    bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{o.name}.glb'),export_format='GLB',use_selection=True,export_animations=False)
    o.location=((v-1)*2,0,0)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'sunflower-library.blend'))
floor=mat('StudioGround',(.45,.39,.27)); bpy.ops.mesh.primitive_plane_add(size=100); bpy.context.object.data.materials.append(floor)
bpy.ops.object.camera_add(location=(4,-10,5)); camera=bpy.context.object; camera.rotation_euler=(Vector((0,0,1.2))-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.type='ORTHO'; camera.data.ortho_scale=7.5
scene=bpy.context.scene; scene.camera=camera
for loc,energy,size in [((0,-4,9),1300,6),((-5,3,7),900,5)]:
    bpy.ops.object.light_add(type='AREA',location=loc); bpy.context.object.data.energy=energy; bpy.context.object.data.size=size
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=1400; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'sunflower-preview.png'); bpy.ops.render.render(write_still=True)

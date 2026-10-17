"""Generate six editable architectural scenery models and their GLBs."""
import bpy
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent / 'buildings'
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=.8
    return m

trim=material('BuildingTrim',(.84,.79,.67))
glass=material('WindowGlass',(.09,.20,.25))
wood=material('Doors',(.22,.10,.045))
shutters=material('Shutters',(.12,.24,.16))
stone=material('FoundationStone',(.38,.36,.32))
metal=material('Railings',(.08,.09,.085))
parts=[]

def box(name, pos, size, mat):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos)
    o=bpy.context.object; o.name=name; o.scale=size; o.data.materials.append(mat); parts.append(o)
    return o

def mesh(name, vertices, faces, mat):
    data=bpy.data.meshes.new(name); data.from_pydata(vertices,[],faces); data.update()
    o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o); o.data.materials.append(mat); parts.append(o)
    return o

def roof(cx,cy,z,w,d,rise,mat,tiles=False):
    # Closed gable roof with genuine pitched sides and overhanging eaves.
    mesh('PitchedRoof',[(cx-w/2,cy-d/2,z),(cx+w/2,cy-d/2,z),(cx,cy-d/2,z+rise),
                           (cx-w/2,cy+d/2,z),(cx+w/2,cy+d/2,z),(cx,cy+d/2,z+rise)],
         [(0,3,5,2),(2,5,4,1),(0,2,1),(3,4,5),(0,1,4,3)],mat)
    box('RidgeCap',(cx,cy,z+rise+.035),(.14,d+.08,.11),mat)
    if tiles:
        for side in [-1,1]:
            for i in range(1,12):
                x=side*w/2*i/12
                o=box('TileRow',(cx+x,cy,z+rise*(1-i/12)+.035),(.045,d,.05),mat)
            for j in range(int(d/.28)):
                y=cy-d/2+.14+j*.28
                o=box('TerracottaTileSeam',(cx+side*w/4,y,z+rise/2+.035),(math.hypot(w/2,rise),.025,.025),mat)
                o.rotation_euler.y=side*math.atan2(rise,w/2)
    else:
        for i in range(1,8):
            for side in [-1,1]:
                box('ShingleCourse',(cx+side*w/2*i/8,cy,z+rise*(1-i/8)+.025),(.025,d,.025),mat)

def window(x,y,z,villa=False):
    box('WindowSurround',(x,y,z),(.91,.14,1.22),trim)
    box('WindowPane',(x,y-.085,z),(.72,.045,1.03),glass)
    box('WindowMullion',(x,y-.12,z),(.045,.04,1.05),trim)
    box('WindowCrossbar',(x,y-.12,z),(.74,.04,.045),trim)
    box('WindowSill',(x,y-.13,z-.60),(1.03,.32,.10),trim)
    if villa:
        for side in [-1,1]:
            box('WoodShutter',(x+side*.62,y-.03,z),(.30,.13,1.10),shutters)
            for i in range(5): box('ShutterSlat',(x+side*.62,y-.11,z-.42+i*.2),(.27,.025,.035),trim)

for kind in ['villa','house']:
    for variant in range(3):
        parts=[]
        italian=kind=='villa'
        wall=material(f'{kind.title()}Walls{variant+1}',[(.72,.54,.34),(.81,.70,.51),(.72,.40,.27)][variant] if italian else [(.55,.63,.65),(.71,.62,.50),(.66,.70,.60)][variant])
        roofing=material(f'{kind.title()}Roof{variant+1}',(.46,.17,.07) if italian else [(.15,.17,.19),(.23,.20,.18),(.18,.22,.23)][variant])
        w=[6.4,7.2,6][variant]; d=[5,5.5,5.2][variant]
        h=5.7 if italian or variant!=1 else 3.2
        box('Foundation',(0,0,.18),(w+.15,d+.15,.36),stone)
        box('MainWalls',(0,0,h/2+.28),(w,d,h),wall)
        roof(0,0,h+.28,w+.65,d+.7,1.5,roofing,italian)
        front=-d/2-.04
        for z in ([1.95,4.65] if h>4 else [1.95]):
            for x in [-w*.32,w*.32]: window(x,front,z,italian)
        # Rear windows ensure the model is detailed from both riding directions.
        for z in ([1.95,4.65] if h>4 else [1.95]):
            for x in [-w*.3,0,w*.3]:
                before=len(parts); window(x,front,z,italian)
                for o in parts[before:]: o.location.y *= -1
        box('DoorFrame',(0,front-.06,1.48),(1.28,.20,2.48),trim)
        box('FrontDoor',(0,front-.18,1.43),(1.03,.09,2.23),wood)
        for z in [.88,1.65]: box('DoorPanel',(0,front-.24,z),(.77,.04,.52),trim)
        box('DoorHandle',(.35,front-.29,1.35),(.06,.05,.18),metal)
        for i in range(3): box('EntrySteps',(0,front-.45-i*.30,.22-i*.06),(1.8,.65,.16),stone)
        box('Chimney',(w*.24,.9,h+1.05),(.55,.65,1.8),wall)
        box('ChimneyCap',(w*.24,.9,h+2),(.72,.82,.14),trim)
        if italian:
            # Balcony with individually modeled balusters and stone brackets.
            box('BalconySlab',(0,front-.6,3.65),(2.8,1.3,.18),stone)
            window(0,front,4.65,True)
            for x in [-1.3,1.3]: box('BalconySideRail',(x,front-.6,4.5),(.055,1.3,.06),metal)
            box('BalconyTopRail',(0,front-1.23,4.5),(2.65,.06,.06),metal)
            for i in range(11): box('Baluster',(-1.25+i*.25,front-1.23,4.06),(.04,.04,.85),metal)
            if variant==1:
                box('SideWing',(w/2+1.15,.35,1.7),(2.5,4,3.1),wall)
                roof(w/2+1.15,.35,3.25,2.9,4.4,.9,roofing,True)
            if variant==2:
                for x in [-1.6,1.6]: box('PergolaPost',(x,front-2,1.65),(.16,.16,3),wood)
                for i in range(7): box('PergolaBeam',(-1.65+i*.55,front-1,3.2),(.12,2.5,.15),wood)
        else:
            gx=w/2+1.6
            box('Garage',(gx,.25,1.62),(3.4,4.5,2.9),wall)
            roof(gx,.25,3.07,3.8,4.9,1,roofing)
            box('GarageDoor',(gx,-2.02,1.42),(2.75,.09,2.35),trim)
            for i in range(5): box('GarageDoorSeam',(gx,-2.08,.48+i*.43),(2.65,.04,.025),stone)
            box('PorchRoof',(0,front-.85,2.85),(2.8,1.9,.20),roofing)
            for x in [-1.15,1.15]: box('PorchColumn',(x,front-1.5,1.55),(.15,.15,2.65),trim)
            # Horizontal siding gives suburban walls some fine-scale relief.
            for i in range(int(h/.25)):
                z=.4+i*.25
                for x in [-w/2-.015,w/2+.015]: box('SidingCourse',(x,0,z),(.025,d,.025),trim)
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts: o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join()
        o=bpy.context.object; o.name=f'{kind}-{variant+1}'
        bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        bpy.ops.export_scene.gltf(filepath=str(OUT/f'{o.name}.glb'),export_format='GLB',use_selection=True,export_animations=False)
        o.location=((variant-1)*14,0 if italian else -13,0)

bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'building-library.blend'))
floor=material('StudioFloor',(.49,.54,.43))
bpy.ops.mesh.primitive_plane_add(size=200); bpy.context.object.data.materials.append(floor)
bpy.ops.object.camera_add(location=(28,-48,30)); camera=bpy.context.object
camera.rotation_euler=(Vector((1,-5,2.5))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=55
scene=bpy.context.scene; scene.camera=camera
for loc,energy,size in [((0,-10,25),7000,18),((-18,6,20),5000,15)]:
    bpy.ops.object.light_add(type='AREA',location=loc); bpy.context.object.data.energy=energy; bpy.context.object.data.size=size
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=1600; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'building-library-preview.png'); bpy.ops.render.render(write_still=True)

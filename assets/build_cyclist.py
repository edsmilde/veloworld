"""Build the editable VeloWorld cyclist and GLB using Blender's Python API.
Run: Blender --background --python assets/build_cyclist.py
Coordinates: Blender +Y forward, +Z up; GLB maps forward to Three.js -Z.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
materials = {}
for name, color, metallic in [
    ('BikeFrame', (0.04, .28, .38), .65), ('KitJersey', (.85, .13, .08), 0),
    ('KitShorts', (.025, .035, .05), 0), ('Skin', (.63, .38, .23), 0),
    ('Hair', (.08, .035, .018), 0), ('Helmet', (.92, .93, .88), .05),
    ('Shoes', (.88, .89, .86), .05), ('Gloves', (.04, .05, .06), 0),
    ('Tires', (.012, .016, .02), 0), ('Metal', (.48, .52, .55), .85),
    ('SaddleAndTape', (.025, .03, .035), 0), ('Eyewear', (.035, .1, .14), .35),
]:
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = .4 if metallic else .65
    materials[name] = mat

def finish(obj, name, material):
    obj.name = name
    obj.data.materials.append(materials[material])
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def ellipsoid(name, center, radii, material):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=center)
    obj = finish(bpy.context.object, name, material)
    obj.scale = radii
    return obj

def tube(name, start, end, radius, material, top_radius=None):
    start, end = Vector(start), Vector(end)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=radius, radius2=top_radius or radius, depth=(end-start).length, location=(start+end)/2)
    obj = finish(bpy.context.object, name, material)
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (end-start).to_track_quat('Z', 'Y')
    return obj

def torus(name, center, major, minor, material):
    bpy.ops.mesh.primitive_torus_add(major_segments=48, minor_segments=8, major_radius=major, minor_radius=minor, location=center, rotation=(0, math.pi/2, 0))
    return finish(bpy.context.object, name, material)

rear = (0, -.5, .35)
front = (0, .52, .35)
bb = (0, -.05, .29)
seat = (0, -.22, .8)
head_bottom = (0, .36, .66)
head_top = (0, .31, .84)
wheel_roots = []
for label, hub in [('Rear', rear), ('Front', front)]:
    bpy.ops.object.empty_add(location=hub)
    root = bpy.context.object
    root.name = label + 'Wheel'
    wheel_roots.append(root)
    parts = [torus(label+'Tire', hub, .327, .023, 'Tires'), torus(label+'Rim', hub, .303, .015, 'Metal'), tube(label+'Hub', (-.035,hub[1],hub[2]), (.035,hub[1],hub[2]), .022, 'Metal')]
    for i in range(20):
        a = i*math.tau/20
        parts.append(tube(label+'Spoke', hub, (0,hub[1]+math.sin(a)*.3,hub[2]+math.cos(a)*.3), .0018, 'Metal'))
    for part in parts:
        part.parent = root
        part.matrix_parent_inverse = root.matrix_world.inverted()

for name, a, b, radius in [('SeatTube',bb,seat,.022), ('TopTube',seat,head_top,.023), ('DownTube',bb,head_bottom,.029), ('HeadTube',head_bottom,head_top,.027)]:
    tube(name,a,b,radius,'BikeFrame')
for side in [-1,1]:
    dropout=(side*.055,rear[1],rear[2])
    tube('SeatStay',seat,dropout,.011,'BikeFrame')
    tube('ChainStay',bb,dropout,.013,'BikeFrame')
    tube('Fork',head_bottom,(side*.045,front[1],front[2]),.014,'BikeFrame')
tube('SeatPost',seat,(0,-.25,.96),.014,'Metal')
ellipsoid('Saddle',(0,-.25,.965),(.085,.14,.025),'SaddleAndTape')
tube('Stem',head_top,(0,.43,.91),.014,'Metal')
tube('HandlebarTop',(-.19,.43,.91),(.19,.43,.91),.013,'SaddleAndTape')
for side in [-1,1]:
    points=[(side*.19,.43,.91),(side*.19,.54,.9),(side*.19,.59,.85),(side*.19,.58,.76),(side*.19,.49,.74)]
    for a,b in zip(points,points[1:]): tube('DropHandlebar',a,b,.014,'SaddleAndTape')
    ellipsoid('BrakeHood',(side*.19,.54,.925),(.023,.042,.036),'SaddleAndTape')
torus('Chainring',(.085,bb[1],bb[2]),.085,.006,'Metal')
torus('Cassette',(.075,rear[1],rear[2]),.045,.011,'Metal')
tube('ChainUpper',(.085,-.05,.375),(.075,-.5,.395),.004,'Metal')
tube('ChainLower',(.085,-.05,.205),(.075,-.5,.305),.004,'Metal')
tube('Bottle',(0,.1,.48),(0,.17,.59),.035,'Helmet')

hip = Vector((0,-.23,1.025))
shoulder = Vector((0,.22,1.35))
torso=ellipsoid('JerseyTorso',(hip+shoulder)/2,(.145,.14,.31),'KitJersey')
torso.rotation_mode='QUATERNION'
torso.rotation_quaternion=(shoulder-hip).to_track_quat('Z','Y')
ellipsoid('BibShortsPelvis',hip,(.145,.13,.105),'KitShorts')
tube('Neck',(0,.23,1.36),(0,.29,1.44),.052,'Skin')
ellipsoid('Head',(0,.31,1.5),(.082,.105,.115),'Skin')
ellipsoid('Hair',(0,.28,1.56),(.084,.095,.071),'Hair')
ellipsoid('Nose',(0,.414,1.5),(.023,.032,.026),'Skin')
for side in [-1,1]:
    ellipsoid('Ear',(side*.08,.3,1.5),(.014,.023,.032),'Skin')
    s=(side*.14,.21,1.34); elbow=(side*.17,.32,1.12); wrist=(side*.19,.535,.94)
    tube('JerseySleeve',s,(side*.155,.25,1.25),.066,'KitJersey',.057)
    tube('UpperArm',(side*.155,.25,1.25),elbow,.05,'Skin',.039)
    ellipsoid('Elbow',elbow,(.039,.039,.039),'Skin')
    tube('Forearm',elbow,wrist,.04,'Skin',.026)
    ellipsoid('GlovedHand',wrist,(.032,.044,.031),'Gloves')
    tube('HelmetStrap',(side*.085,.3,1.58),(side*.045,.31,1.41),.004,'SaddleAndTape')
ellipsoid('HelmetShell',(0,.3,1.605),(.105,.143,.065),'Helmet')
for x in [-.06,-.03,0,.03,.06]:
    ellipsoid('HelmetVent',(x,.31,1.661),(.007,.09,.004),'SaddleAndTape')
ellipsoid('Sunglasses',(0,.405,1.53),(.085,.012,.025),'Eyewear')

# Explicit articulated mesh segments: editable and exported as a looping action.
leg_parts=[]
for side in [-1,1]:
    thigh=tube('Thigh', (side*.1,-.23,1.025),(side*.1,.1,.65),.074,'KitShorts',.056)
    shin=tube('Shin',(side*.1,.1,.65),(side*.1,-.05,.3),.048,'Skin',.027)
    knee=ellipsoid('Knee',(side*.1,.1,.65),(.052,.052,.052),'Skin')
    shoe=ellipsoid('CyclingShoe',(side*.115,0,.3),(.047,.115,.035),'Shoes')
    crank=tube('Crank', (side*.095,*bb[1:]),(side*.095,-.05,.46),.01,'Metal')
    pedal=ellipsoid('Pedal',(side*.115,-.05,.46),(.055,.04,.009),'Metal')
    leg_parts.append((side,thigh,shin,knee,shoe,crank,pedal))

# Use local mesh bounds, rather than world-space dimensions, for limb lengths.
rest_lengths={obj.name:max(v.co.z for v in obj.data.vertices)-min(v.co.z for v in obj.data.vertices) for _,*parts in leg_parts for obj in parts if obj.name.startswith(('Thigh','Shin','Crank'))}
for frame in range(1,50):
    phase=(frame-1)/48*math.tau
    for side,thigh,shin,knee,shoe,crank,pedal in leg_parts:
        a=phase+(math.pi if side==1 else 0)
        ankle=Vector((side*.115,bb[1]+.17*math.sin(a),bb[2]+.17*math.cos(a)+.035))
        h=Vector((side*.1,hip.y,hip.z))
        delta=ankle-h
        d=delta.length
        upper=.43; lower=.43
        along=(upper*upper-lower*lower+d*d)/(2*d)
        bend=math.sqrt(max(0,upper*upper-along*along))
        direction=delta.normalized()
        forward=Vector((0,-direction.z,direction.y)).normalized()
        k=h+direction*along+forward*bend
        for obj,start,end in [(thigh,h,k),(shin,k,ankle),(crank,(side*.095,bb[1],bb[2]),(side*.095,ankle.y,ankle.z-.035))]:
            start,end=Vector(start),Vector(end)
            obj.location=(start+end)/2
            obj.rotation_quaternion=(end-start).to_track_quat('Z','Y')
            obj.scale.z=(end-start).length/rest_lengths[obj.name]
            for prop in ['location','rotation_quaternion','scale']: obj.keyframe_insert(data_path=prop,frame=frame)
        for obj,loc in [(knee,k),(shoe,ankle+Vector((0,.035,0))),(pedal,ankle-Vector((0,0,.035)))]:
            obj.location=loc
            obj.keyframe_insert(data_path='location',frame=frame)

scene=bpy.context.scene
scene.frame_start=1; scene.frame_end=49; scene.render.fps=48
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'road-cyclist.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'road-cyclist.glb'),export_format='GLB',export_animations=True,export_animation_mode='SCENE',export_frame_range=True)

# Studio preview kept outside the exported game asset.
floor=ellipsoid('StudioFloor',(0,0,-.06),(200,200,.06),'Helmet')
bpy.ops.object.camera_add(location=(3.1,3.5,2.3))
camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,.85))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO'; camera.data.ortho_scale=2.7
scene.camera=camera
for loc,energy,size in [((2,1,4),500,4),((-2,-1,3),350,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc)
    bpy.context.object.data.energy=energy; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=size
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1000; scene.render.resolution_y=900; scene.render.resolution_percentage=100
scene.render.filepath=str(OUT/'road-cyclist-preview.png')
bpy.ops.render.render(write_still=True)

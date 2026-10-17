"""Create shrubs, flowering bushes, cottages and barns (three variants each)."""
import bpy, math, random
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
def mat(name,color):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=.85
    return m
leaf=mat('ShrubLeaves',(.12,.27,.07)); stem=mat('PlantStems',(.24,.13,.05))
flowers=[mat('Flowers'+str(i),c) for i,c in enumerate([(.65,.17,.40),(.76,.59,.13),(.50,.30,.64)])]
trim=mat('BuildingTrim',(.82,.78,.66)); wood=mat('BuildingDoors',(.25,.12,.05)); glass=mat('WindowGlass',(.08,.21,.25)); stone=mat('Stone',(.39,.38,.34))
roofmat=mat('Roof',(.19,.22,.23)); thatch=mat('CottageRoof',(.38,.24,.12))
parts=[]
def box(pos,size,m):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos); o=bpy.context.object; o.scale=size; o.data.materials.append(m); parts.append(o); return o
def ball(pos,size,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=pos); o=bpy.context.object; o.scale=size; o.data.materials.append(m); parts.append(o)
def pitched(w,d,z,rise,m):
    data=bpy.data.meshes.new('GableRoof'); data.from_pydata([(-w/2,-d/2,z),(w/2,-d/2,z),(0,-d/2,z+rise),(-w/2,d/2,z),(w/2,d/2,z),(0,d/2,z+rise)],[],[(0,3,5,2),(2,5,4,1),(0,2,1),(3,4,5),(0,1,4,3)]); data.update()
    o=bpy.data.objects.new('GableRoof',data); bpy.context.collection.objects.link(o); o.data.materials.append(m); parts.append(o)
    for side in [-1,1]:
        for i in range(1,10): box((side*w/2*i/10,0,z+rise*(1-i/10)+.03),(.045,d,.04),m)
def window(x,y,z):
    box((x,y,z),(1,.15,1.1),trim); box((x,y-.09,z),(.80,.04,.88),glass)
    box((x,y-.12,z),(.045,.03,.9),trim); box((x,y-.12,z),(.82,.03,.045),trim)
    box((x,y-.16,z-.55),(1.12,.30,.10),stone)
for kind in ['shrub','flowers','cottage','barn']:
    for v in range(3):
        parts=[]; rng=random.Random(330+v)
        if kind in ['shrub','flowers']:
            for i in range(9):
                a=i*2.4; r=rng.uniform(.2,.8); x=math.cos(a)*r; y=math.sin(a)*r
                z=rng.uniform(.5,1.15)*(1+v*.12)
                box((x*.5,y*.5,z*.4),(.07,.07,z*.8),stem)
                ball((x,y,z),(.6+rng.random()*.25,.6+rng.random()*.25,.5+rng.random()*.25),leaf)
                if kind=='flowers':
                    for j in range(5):
                        angle=j*2.4; fx=x+.42*math.cos(angle); fy=y+.42*math.sin(angle)
                        ball((fx,fy,z+.46),(.13,.13,.09),flowers[v])
                        ball((fx,fy,z+.53),(.045,.045,.03),trim)
        else:
            cottage=kind=='cottage'; w=[6,6.8,5.8][v]; d=5; h=3.1 if cottage else 4.2
            walls=mat(kind+'Walls'+str(v),[(.66,.62,.51),(.68,.53,.38),(.61,.66,.59)][v] if cottage else [(.45,.12,.08),(.51,.29,.12),(.37,.40,.35)][v])
            box((0,0,.13),(w+.2,d+.2,.26),stone); box((0,0,h/2+.2),(w,d,h),walls)
            pitched(w+.7,d+.7,h+.2,2.1 if cottage else 2.4,thatch if cottage else roofmat)
            front=-d/2-.04
            if cottage:
                window(-w*.30,front,1.75); window(w*.30,front,1.75)
                box((0,front-.07,1.25),(1.3,.16,2.15),trim); box((0,front-.18,1.2),(1.05,.08,2),wood)
                box((0,front-.65,.17),(2.4,1.1,.22),stone)
                box((w*.28,.8,h+1.4),(.65,.7,2.3),stone)
                box((w*.28,.8,h+2.6),(.85,.9,.15),trim)
                for x in [-1.4,1.4]: box((x,front-.7,.6),(.7,.5,.25),wood); ball((x,front-.7,.84),(.45,.33,.25),leaf)
                if v==1:
                    box((0,front-.8,2.6),(2.8,1.7,.18),thatch)
                    for x in [-1.2,1.2]: box((x,front-1.4,1.4),(.12,.12,2.5),trim)
            else:
                box((0,front-.08,1.72),(3.1,.16,3.2),trim); box((0,front-.18,1.7),(2.85,.09,3.0),wood)
                for x in [-.70,.70]:
                    beam=box((x,front-.25,1.7),(.11,.04,3.1),trim); beam.rotation_euler.y=math.atan2(1.3,2.7)*(1 if x<0 else -1)
                box((0,front-.26,1.7),(.05,.04,3),trim)
                window(0,front,h+.5)
                for x in [-w/2-.02,w/2+.02]:
                    for i in range(16): box((x,-d/2+i*d/15,h/2+.2),(.05,.05,h),trim)
                if v==2:
                    box((w/2+.8,0,1.25),(1.8,4.7,2.2),walls)
                    box((w/2+.9,0,2.4),(2.1,5,.18),roofmat)
            # Windows on the back, with outward-facing frames.
            for x in [-w*.28,w*.28]:
                before=len(parts); window(x,front,1.8)
                for o in parts[before:]: o.location.y *= -1
        bpy.ops.object.select_all(action='DESELECT')
        for o in parts: o.select_set(True)
        bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join(); o=bpy.context.object; o.name=f'{kind}-{v+1}'
        bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR'); bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
        folder=ROOT/('trees' if kind in ['shrub','flowers'] else 'buildings')
        bpy.ops.export_scene.gltf(filepath=str(folder/f'{o.name}.glb'),export_format='GLB',use_selection=True,export_animations=False)
        o.location=((v-1)*12,{'shrub':-22,'flowers':-18,'cottage':-10,'barn':0}[kind],0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'extra-scenery-library.blend'))
floor=mat('StudioFloor',(.49,.54,.43)); bpy.ops.mesh.primitive_plane_add(size=200); bpy.context.object.data.materials.append(floor)
bpy.ops.object.camera_add(location=(25,-48,30)); camera=bpy.context.object; camera.rotation_euler=(Vector((0,-9,2))-camera.location).to_track_quat('-Z','Y').to_euler(); camera.data.type='ORTHO'; camera.data.ortho_scale=49
scene=bpy.context.scene; scene.camera=camera
for loc,energy,size in [((0,-10,25),6500,15),((-15,5,20),4500,12)]:
    bpy.ops.object.light_add(type='AREA',location=loc); bpy.context.object.data.energy=energy; bpy.context.object.data.size=size
scene.render.engine='BLENDER_EEVEE'; scene.render.resolution_x=1600; scene.render.resolution_y=1100; scene.render.resolution_percentage=100
scene.render.filepath=str(ROOT/'extra-scenery-preview.png'); bpy.ops.render.render(write_still=True)

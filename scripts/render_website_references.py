"""Render actual intermediate references with the accepted studio materials.

Uses saved reference states, never policy frames. All new portable geometry,
RGBA caches and provenance stay in assets/cache; only the preview is public.
Run with the existing hort environment, from the website root.
"""
import json
import os
from pathlib import Path
import subprocess
import sys

os.environ.setdefault('PYOPENGL_PLATFORM', 'egl')
os.environ.setdefault('LP_NUM_THREADS', '2')
sys.dont_write_bytecode = True
import numpy as np
from scipy.spatial.transform import Rotation
import trimesh
import pyrender

ROOT=Path(__file__).resolve().parents[1]
PROJECT=Path('/home/meenalp/Desktop/PhD/trackart2')
CACHE=ROOT/'assets/cache/website-references'
OUT=ROOT/'assets/references/studio'
sys.path.insert(0,str(ROOT/'tweet/run-27'))
import assemble_table as bake
sys.path.insert(0,str(ROOT/'tweet/run-33/rendering'))
import alpha as alpha33
look=alpha33.look31


def bake_reference(path,key):
    stage=CACHE/key
    if (stage/'stage_manifest.json').exists():return stage
    motion=bake.table._load_motion(path)
    count=len(motion['scene_object_pos']);indices=np.arange(count)
    roles=[];parts=[];states=[]
    base=np.asarray(motion.get('robot_base_pose',np.eye(4)))
    for frame in indices:
        frame_parts=[];frame_roles=[]
        for side in ['left','right']:
            active=np.asarray(motion.get(f'is_active_{side}',[side=='right'])).reshape(-1)
            if not bool(active[min(frame,len(active)-1)]):continue
            values=dict(zip(motion[f'{side}_jnames'],motion[f'{side}_jvals'][frame]))
            hand=bake.instances(str(bake.table.XHAND/f'xhand_{side}_6dof_abs_obj.urdf'),base,values,'ceramic')
            frame_parts.extend(hand);frame_roles.extend(['hand']*len(hand))
        for i,oid in enumerate(motion['scene_object_ids']):
            if str(oid)=='table' or 'support' in str(oid).lower():continue
            pose=np.eye(4);pose[:3,3]=motion['scene_object_pos'][frame,i]
            pose[:3,:3]=Rotation.from_rotvec(motion['scene_object_rot'][frame,i]).as_matrix()
            names=bake.table._names_for_object(motion.get('scene_object_arti_names',[]),i)
            values=dict(zip(names,motion['scene_object_arti_vals'][frame,i]))
            items=bake.instances(str(motion['scene_object_urdf_paths'][i]),pose,values,'ceramic')
            frame_parts.extend(items);frame_roles.extend(['object']*len(items))
        if not parts:parts=[mesh.copy()for mesh,_ in frame_parts];roles=frame_roles
        states.append([pose for _,pose in frame_parts])
    parts.append(trimesh.creation.box((2.,2.,.02)));roles.append('table')
    poses=np.stack(states);poses=np.concatenate([poses,np.tile(np.eye(4),(len(poses),1,1))[:,None]],axis=1)
    stage.mkdir(parents=True,exist_ok=True);elements=[]
    for i,(mesh,role)in enumerate(zip(parts,roles)):
        mesh.export(stage/f'{i:03}.obj');elements.append(dict(mesh=f'{i:03}.obj',role=role,color_rgba=[155,161,166,255]))
    np.savez_compressed(stage/'poses.npz',poses=poses,frame_indices=indices)
    (stage/'stage_manifest.json').write_text(json.dumps(dict(poses='poses.npz',elements=elements,metadata={'reference':str(path)})))
    return stage


def render(record,key,stage):
    output=OUT/f'{key}.mp4'
    if output.exists():return
    record={**record,'stage':str(stage),'collection':'original'}
    task=look.load_task(record)
    scene,eye,target=look.build_scene(task,'satinmixed')
    scene.bg_color=(0.,0.,0.,0.)
    floor=max(scene.mesh_nodes,key=lambda n:np.prod(np.ptp(n.mesh.bounds,axis=0)[:2]))
    for primitive in floor.mesh.primitives:
        primitive.material.emissiveFactor=(0.,.01,0.);primitive.material.alphaMode='BLEND'
    alpha33.bounded_stacking_support(task,scene,record)
    camera=scene.main_camera_node
    scene.set_pose(camera,look.native.look_at(target+(eye-target)*1.5,target))
    camera.camera.yfov=2*np.arctan(np.tan(np.deg2rad(42)/2)*2);camera.camera.aspectRatio=1.6
    width,height=1920,1200;renderer=alpha33.AlphaRenderer(width,height)
    fps=24;count=max(2,int(np.ceil(task.duration_seconds*fps)))
    seconds=np.minimum(np.arange(count)/fps,task.sample_times[-1]);seconds[-1]=task.sample_times[-1]
    poses=look.native.interpolate_poses(task.poses,np.interp(seconds,task.sample_times,np.arange(len(task.poses))))
    rgba_path=CACHE/f'{key}.mkv'
    encoder=subprocess.Popen(['ffmpeg','-y','-v','error','-f','rawvideo','-pix_fmt','rgba','-s',f'{width}x{height}','-r',str(fps),'-i','-','-an','-c:v','ffv1','-threads','2','-pix_fmt','bgra',str(rgba_path)],stdin=subprocess.PIPE)
    bounds=np.array([width,height,0,0]);border=0
    try:
        for frame in poses:
            for node,state in zip(task.nodes,frame):scene.set_pose(node,state)
            rgba=alpha33.straight_rgba(renderer.render(scene,flags=pyrender.RenderFlags.RGBA|pyrender.RenderFlags.SHADOWS_DIRECTIONAL)[0])
            border=max(border,alpha33.border_alpha(rgba));ys,xs=np.where(rgba[:,:,3]>1)
            bounds[:2]=np.minimum(bounds[:2],[xs.min(),ys.min()]);bounds[2:]=np.maximum(bounds[2:],[xs.max()+1,ys.max()+1])
            encoder.stdin.write(rgba.tobytes())
        encoder.stdin.close();assert encoder.wait()==0
    finally:renderer.delete()
    assert border<=1,(key,'shadow clipping',border)
    l,t,r,b=bounds;l=max(0,(l-16)//2*2);t=max(0,(t-16)//2*2);r=min(width,(r+17)//2*2);b=min(height,(b+17)//2*2)
    filters=f'[0:v]crop={r-l}:{b-t}:{l}:{t},scale=960:600:force_original_aspect_ratio=decrease,format=rgba,pad=960:600:(ow-iw)/2:(oh-ih)/2:color=0x00000000[fg];color=c=0xF5F4F1:s=960x600:r=24[bg];[bg][fg]overlay=shortest=1:format=auto,format=yuv420p[v]'
    subprocess.run(['ffmpeg','-y','-v','error','-threads','2','-i',str(rgba_path),'-filter_complex_threads','1','-filter_complex',filters,'-map','[v]','-an','-c:v','libx264','-crf','20','-threads','2','-movflags','+faststart',str(output)],check=True)
    (CACHE/f'{key}-render.json').write_text(json.dumps(dict(reference_stage=str(stage),frames=count,fps=fps,border_alpha_max=border,kind='intermediate reference',source_poses_unchanged=True,crop=[int(x)for x in [l,t,r,b]]),indent=2)+'\n')
    print(f'Rendered actual reference {key}: {count} frames',flush=True)


def main():
    CACHE.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    collection=json.loads((ROOT/'tweet/run-29/collection.json').read_text())['tasks'];records={r['id']:r for r in collection}
    configs=[('cup_045','cup-045-seed52','tmp/v3_01_controllability_pipeline/v3_01_cup_pose_tilt_045deg/exports/cup_pose_tilt_045deg.npz'),('cup_090','cup-090','tmp/v3_01_controllability_pipeline/v3_01_cup_pose_tilt_090deg/exports/cup_pose_tilt_090deg.npz'),('cup_120','cup-120','tmp/v3_01_controllability_pipeline/v3_01_cup_pose_tilt_120deg/exports/cup_pose_tilt_120deg.npz'),('strategy_pick','strategy-pick','tmp/v3_01_controllability_pipeline/v3_01_cube_strategy_pick/exports/cube_strategy_pick.npz'),('strategy_push','strategy-push','tmp/v3_01_controllability_pipeline/v3_01_cube_strategy_push/exports/cube_strategy_push.npz'),('bottle_side','bottle-side-100','logs/v3_03_reusability_pipeline/v3_03_reuse_bottle_side_scale_100/exports/reach_grasp_lift.npz'),('bottle_top','bottle-top-100','logs/v3_03_reusability_pipeline/v3_03_reuse_bottle_top_scale_100/exports/reach_grasp_lift.npz'),('hammer_slow','hammer-slow','logs/v3_07_controllability_hammer2_pipeline/v3_controllability_hammer2_slow/exports/hammer2_pick_and_strike_slow_oakink_sequence_refined_hold5.npy'),('hammer_fast','hammer-fast','logs/v3_07_controllability_hammer2_pipeline/v3_controllability_hammer2_fast/exports/hammer2_pick_and_strike_fast_oakink_sequence_refined_hold5.npy')]
    for key,tid,path in configs:
        stage=bake_reference(bake.resolve_path(PROJECT/path),key);render(records[tid],key,stage)
    for key,tid in [('open_notebook','open-notebook'),('stack_blocks','stack-blocks'),('banana_handover','banana-handover'),('mug_grasp_change','mug-grasp-change')]:
        stage=Path(records[tid]['stage']).parent/'03_reference_motion'
        render(records[tid],key,stage)


if __name__=='__main__':main()

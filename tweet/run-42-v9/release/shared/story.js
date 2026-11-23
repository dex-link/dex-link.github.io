/* Variant sequencing shares native motion/media rather than duplicating assets. */
(() => {
  const W=1600,H=900,FPS=24,clamp=x=>Math.min(1,Math.max(0,x));
  const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const mix=(a,b,p)=>a+(b-a)*p;
  const hermite=(a,b,velocity,p)=>{
    p=clamp(p);return (2*p*p*p-3*p*p+1)*a+(p*p*p-2*p*p+p)*velocity+(-2*p*p*p+3*p*p)*b;
  };
  class Run39Story {
    constructor(config){
      this.config=config;let cursor=0;
      this.segments=config.segments.map(segment=>{const duration=segment.seconds??(segment.source_end-segment.source_start);
        const value={...segment,start:cursor,end:cursor+duration};cursor+=duration;return value;});
      this.frames=Math.round(cursor*FPS);this.duration=this.frames/FPS;
      this.current=this.map(0);this.extra=[];
    }
    map(time){
      const t=Math.min(Math.max(0,time),this.duration-1e-7);
      const segment=this.segments.find(s=>t>=s.start&&t<s.end)||this.segments.at(-1);
      const local=t-segment.start;
      const source=segment.kind==='opener'?2.55:segment.kind==='bridge'?8.5+Math.min(local,2.25-1/240):segment.source_start+local;
      return{...segment,time:t,local,remaining:segment.end-t,source:Math.min(source,44.25-1/240)};
    }
    install(motion,layout,buildOnly=false){
      this.motion=motion;this.layout=layout;this.buildOnly=buildOnly;
      const video=(id,src)=>{const v=document.createElement('video');v.id=id;v.className='r37-story-video';v.muted=true;v.playsInline=true;v.preload='auto';v.src=src;motion.logical.append(v);return v;};
      if(this.segments.some(s=>s.kind==='opener')){
        this.gallery=video('opening-gallery','media/all-tasks.mp4');
        this.galleryWash=document.createElement('div');this.galleryWash.className='r37-gallery-wash';motion.logical.append(this.galleryWash);
      }
      if(this.segments.some(s=>s.kind==='bridge')&&!buildOnly)this.bridge=video('control-bridge','media/bridge.mp4');
    }
    bridgeState(local){
      const motion=this.motion,first=motion.sections[0],initial=motion._gridState(8.0);
      const anchor=motion.base.get('cup-120'),cellW=W*anchor.s;
      const target={...first.snapshot.camera,cx:first.snapshot.camera.cx-cellW};
      const ax=anchor.x+W*anchor.s/2,ay=anchor.y+H*anchor.s/2;
      const project=camera=>({x:W/2+(ax-camera.cx)*camera.zoom,y:H/2+(ay-camera.cy)*camera.zoom});
      const a=project(initial.camera),b=project(target),dt=1/240;
      const after=project(motion._diversityCamera(8.0+dt));
      const p=clamp(local),logZoom=hermite(Math.log(initial.camera.zoom),Math.log(target.zoom),
        (Math.log(motion._diversityCamera(8+dt).zoom)-Math.log(initial.camera.zoom))/dt,p);
      const zoom=Math.exp(logZoom),x=hermite(a.x,b.x,(after.x-a.x)/dt,p),y=hermite(a.y,b.y,(after.y-a.y)/dt,p);
      const camera={cx:ax-(x-W/2)/zoom,cy:ay-(y-H/2)/zoom,zoom};
      const poses=new Map();
      for(const[id,pose]of motion.base)poses.set(id,{...pose,opacity:1-ease(local/.35)});
      poses.set('cup-120',{...anchor,opacity:1});
      poses.set('cup-045-seed52',{...anchor,x:anchor.x-cellW,opacity:ease((local-.25)/.6)});
      const delay=this.config.early_deployment?.25:0;
      return{poses,camera,phase:'control',section:first,sectionIndex:0,progress:ease(p),
        localTime:Math.max(0,local-delay),time:8.5+Math.min(local,2.25-1/240)};
    }
    bridgeClock(id,local){
      const entry=this.motion.entries.get(id),duration=Number(entry.task.duration);
      if(id==='cup-120'||id==='cup-045-seed52'){
        if(local>=1)return((local-1)*2)%duration;
        const initial=id==='cup-120'?this.motion._mediaTime(entry,{...this.motion._gridState(8),time:8}).time:0;
        return Math.min(duration-1/60,initial+(duration-initial)*local);
      }
      return this.motion._mediaTime(entry,{...this.motion._gridState(8+local),time:8+local}).time;
    }
    exportBridge(){
      const frames=[];
      for(let n=0;n<78;n++){
        const time=n/FPS,state=this.bridgeState(time),c=state.camera,tx=W/2-c.cx*c.zoom,ty=H/2-c.cy*c.zoom,items=[];
        for(const[id,pose]of state.poses){if(pose.opacity<.001)continue;
          const entry=this.motion.entries.get(id);items.push({id,x:pose.x*c.zoom+tx,y:pose.y*c.zoom+ty,
            width:W*pose.s*c.zoom,height:H*pose.s*c.zoom,opacity:pose.opacity,
            source_time:this.bridgeClock(id,time),z:['cup-120','cup-045-seed52'].includes(id)?3:1,
            content_rect:this.motion._contentRect(entry.task)});}
        items.sort((a,b)=>a.z-b.z);frames.push({time,phase:'matched-control-handoff',items});
      }
      return{schema:'dexlink_run39_matched_control_bridge_v1',width:W,height:H,fps:FPS,start:0,end:3.25,frames,
        background:'#F5F4F1',anchor_task:'cup-120',same_native_motion:true};
    }
    realSource(source){
      const m=this.current;
      if(this.config.early_deployment&&m.id==='diversity'&&m.remaining<.3)return 27.25-m.remaining;
      if(this.config.early_deployment&&m.kind==='bridge'&&m.local<.35)return 33.74;
      return source;
    }
    realHold(){return this.config.early_deployment&&((this.current.id==='diversity'&&this.current.remaining<.3)||(this.current.kind==='bridge'&&this.current.local<.35));}
    present(){
      const m=this.current,motion=this.motion;this.extra=[];
      motion.rate.style.opacity=m.kind==='bridge'&&m.local<1?'0':'1';
      if(this.gallery){this.gallery.style.opacity='0';this.galleryWash.style.opacity='0';}
      if(this.bridge)this.bridge.style.opacity='0';
      for(const entry of motion.entries.values())entry.caption.style.opacity='';
      if(m.kind==='opener'){
        const u=clamp(m.local-2),p=ease(u),board=this.layout.tasks.find(t=>t.id==='erase-board');
        const zoom=Math.exp(Math.log(1/board.width)*p);
        const cx=mix(W/2,(board.x+board.width/2)*W,p),cy=mix(H/2,(board.y+board.height/2)*H,p);
        this.gallery.style.transform=`translate(${W/2-cx*zoom}px,${H/2-cy*zoom}px) scale(${zoom})`;
        this.gallery.style.opacity=String(1-ease((p-.35)/.55));
        this.galleryWash.style.opacity=String(1-p);
        motion._hud({...motion.state,phase:'introduction',time:m.local<2?1.0:1.55+u});
        this.extra.push({video:this.gallery,expectedTime:m.local<2?m.local:2-1/FPS,hold:m.local>=2});
      }
      if(m.kind==='bridge'&&this.bridge){
        motion.captureVideo.style.opacity='0';motion.captureVideo.pause();
        this.bridge.style.opacity='1';this.extra.push({video:this.bridge,expectedTime:m.local,hold:false});
        for(const id of motion.sections[0].ids)motion.entries.get(id).caption.style.opacity=String(ease((m.local-.65)/.3));
      }
      const index=this.segments.indexOf(this.segments.find(s=>s.start===m.start));
      if(m.kind==='source'&&this.segments[index-1]?.kind==='bridge'&&m.local<.18&&this.bridge){
        this.bridge.style.opacity=String(1-ease(m.local/.18));
        this.extra.push({video:this.bridge,expectedTime:3.25-1/FPS,hold:true});
      }
      if(this.config.early_deployment&&m.kind==='bridge'&&m.local<.35){
        const real=document.querySelector('#real-layer');real.style.visibility='visible';real.style.opacity=String(1-ease(m.local/.35));
      }
      if(this.gallery&&m.kind!=='opener')this.gallery.pause();
      if(this.bridge&&!this.extra.some(v=>v.video===this.bridge))this.bridge.pause();
    }
  }
  window.Run39Story=Run39Story;
})();

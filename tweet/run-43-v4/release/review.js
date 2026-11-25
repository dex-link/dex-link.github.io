(() => {
  'use strict';
  const query=new URLSearchParams(location.search);
  if(query.has('clean'))document.body.classList.add('clean');
  const BUILD=query.has('buildBridge'),METHOD=33.75,REAL=27.25,FINALE=42.25;
  let TOTAL=44.25,projectTime=0,story,frameRequest,realClockSource=0;
  const stage=document.querySelector('#stage');stage.dataset.clean='true';
  const method=document.querySelector('#method-layer'),detail=document.querySelector('#specify-detail');
  const pipeline=document.querySelector('#pipeline-scene'),real=document.querySelector('#real-layer');
  const realVideo=document.querySelector('#real-policy'),scrub=document.querySelector('#scrub');
  const play=document.querySelector('#play');
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  let motion,playing=false,policyDisclosure,methodMedia;
  const methodVideos=[...method.querySelectorAll('video')];
  const methodStarts={'reference-policy':METHOD+5.0,'grounded-policy':METHOD+5.7};
  const stepStarts=[1.15,4.35,4.85,5.5];
  const stepFades=[.3,.35,.35,.35];
  const deployed='policies deployed ',transfer='zero-shot sim-to-real.';
  const messageMeasure=document.createElement('canvas').getContext('2d');
  const desiredTime=(video,time,start)=>clamp(time-start,0,Math.max(0,(Number.isFinite(video.duration)?video.duration:0)-.04));

  function sizeLayers(){
    const scale=stage.clientWidth/1600;
    method.style.transform=`scale(${scale})`;
    real.style.transform=`scale(${scale})`;
    if(methodMedia)matchMethodFraming();
  }
  new ResizeObserver(sizeLayers).observe(stage);

  function playAt(video,time,start,visible){
    const end=Number.isFinite(video.duration)?video.duration:0;
    const wanted=desiredTime(video,time,start);
    if(!visible||!playing||time<start||time-start>=end-.008){
      video.pause();
      if(visible&&playing&&time<start&&video.currentTime>.02&&!video.seeking)video.currentTime=0;
      return;
    }
    if(Math.abs(video.currentTime-wanted)>.25&&!video.seeking)video.currentTime=wanted;
    video.play().catch(()=>{});
  }

  function typeLine(selector,local,start,seconds){
    const line=document.querySelector(selector);
    const spans=[...line.querySelectorAll('[data-type-text]')];
    const length=spans.reduce((sum,span)=>sum+span.dataset.typeText.length,0);
    const raw=clamp((local-start)/seconds);
    // Exact cue boundaries must not reveal a premature character because of
    // binary floating-point noise in timeline seconds.
    const progress=raw<1e-8?0:raw>1-1e-8?1:raw;
    let remaining=Math.ceil(length*progress);
    for(const span of spans){
      const text=span.dataset.typeText;
      span.textContent=text.slice(0,Math.max(0,remaining));
      remaining-=text.length;
    }
    line.dataset.typing=String(local>=start&&progress<1);
    line.dataset.progress=String(progress);
    return progress;
  }

  function updateMethod(time){
    const active=time>=METHOD&&time<FINALE+.28;
    method.style.visibility=active?'visible':'hidden';method.setAttribute('aria-hidden',String(!active));
    if(!active){
      // A child with visibility:visible can outlive a hidden parent when the
      // reviewer scrubs directly from the expanded specification to another beat.
      detail.style.visibility='hidden';detail.style.opacity='0';
      methodVideos.forEach(v=>v.pause());return;
    }
    const local=time-METHOD;
    const enter=ease(local/.65);
    pipeline.style.transform=`translateX(${(1-enter)*1600}px)`;
    pipeline.style.opacity=String(1-ease((local-(FINALE-METHOD))/.28));
    pipeline.querySelector('h1').style.opacity='1';
    typeLine('#method-heading',local,.65,.5);
    const expanded=ease((local-1.95)/.15)*(1-ease((local-4.0)/.35));
    detail.style.opacity=String(expanded);detail.style.visibility=expanded>.001?'visible':'hidden';
    detail.style.transform='none';
    const waypointsProgress=typeLine('#waypoint-text',local,1.95,.7);
    const templatesProgress=typeLine('#template-text',local,2.65,.9);
    const waypointsReveal=ease(waypointsProgress),templatesReveal=ease(templatesProgress);
    document.querySelector('#waypoints').style.opacity=String(waypointsReveal);
    document.querySelector('#waypoint-text').style.opacity=waypointsProgress>0?'1':'0';
    document.querySelector('#interaction-overlay').style.opacity=String(templatesReveal);
    document.querySelector('#template-text').style.opacity=templatesProgress>0?'1':'0';
    document.querySelector('#template-note').style.opacity=String(ease((local-3.55)/.3));
    [...pipeline.querySelectorAll('article')].forEach((el,i)=>{
      const reveal=ease((local-stepStarts[i])/stepFades[i]);
      el.style.opacity=String(reveal);el.style.transform=`translateX(${(1-reveal)*70}px)`;
    });
    [...pipeline.querySelectorAll('[data-arrow]')].forEach(el=>{
      const i=Number(el.dataset.arrow),reveal=ease((local-stepStarts[i])/stepFades[i]);
      el.style.opacity=String(reveal);el.style.transform=`translateX(${(1-reveal)*35}px)`;
    });
    methodVideos.forEach(v=>playAt(v,time,methodStarts[v.id],active));
  }

  function updateReal(time){
    const visible=time>=REAL-.3&&time<METHOD+.7;
    real.style.visibility=visible?'visible':'hidden';real.setAttribute('aria-hidden',String(!visible));
    real.style.opacity=String(ease((time-(REAL-.3))/.3));
    if(visible){
      const sentence=deployed+transfer,ink=document.querySelector('#real-message-ink');
      const style=getComputedStyle(document.querySelector('.real-message'));
      messageMeasure.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const spacing=parseFloat(style.letterSpacing)||0;
      ink.style.width=`${messageMeasure.measureText(sentence).width+(sentence.length-1)*spacing+6}px`;
      const count=Math.ceil(sentence.length*clamp((time-REAL-.18)/1.35));
      document.querySelector('#real-message-prefix').textContent=deployed.slice(0,count);
      document.querySelector('#real-message-transfer').textContent=transfer.slice(0,Math.max(0,count-deployed.length));
      document.querySelector('#real-type-caret').style.opacity=count<sentence.length?'1':'0';
    }
    playAt(realVideo,time,REAL,visible&&time<METHOD);
  }

  function onTime(source){
    updateMethod(source);realClockSource=story?.realSource(source)??source;updateReal(realClockSource);
    if(policyDisclosure)policyDisclosure.style.opacity=source>=2.6&&source<REAL-.3&&story.current.kind!=='opener'?'1':'0';
    scrub.value=String(projectTime);document.querySelector('#time').textContent=`${projectTime.toFixed(1)} / ${TOTAL.toFixed(2)} s`;
  }
  function applyAlpha(video,media){
    const r=media.nominal_rect;if(!r)throw new Error('Native alpha padding metadata is missing');
    video.src=media.src;video.dataset.alpha='true';
    video.style.width=`${media.width/r.width*100}%`;video.style.height=`${media.height/r.height*100}%`;
    video.style.left=`${-r.x/r.width*100}%`;video.style.top=`${-r.y/r.height*100}%`;
  }
  function matchMethodFraming(){
    const reference=document.querySelector('#reference-policy'),grounded=document.querySelector('#grounded-policy');
    const projectedFocal=(node,media)=>{
      const box=node.parentElement,r=media.nominal_rect;
      return Math.min(box.clientWidth/r.width,box.clientHeight/r.height)*media.nominal_focal_y_pixels;
    };
    // The rollout is widescreen, while the intermediate reference is square.
    // Compensate for object-fit:contain so the same physical cup has the same
    // projected focal scale in both panels, keeping the original aspect ratio.
    const factor=projectedFocal(reference,methodMedia.reference)/projectedFocal(grounded,methodMedia.grounded);
    grounded.style.transformOrigin='50% 50%';grounded.style.transform=`scale(${factor})`;
    grounded.dataset.methodScale=String(factor);
    grounded.dataset.projectedFocal=String(projectedFocal(grounded,methodMedia.grounded)*factor);
    reference.dataset.projectedFocal=String(projectedFocal(reference,methodMedia.reference));
  }
  function pause(){
    playing=false;if(frameRequest)cancelAnimationFrame(frameRequest);motion?.pause();
    document.querySelectorAll('video').forEach(v=>v.pause());play.textContent='play';
  }
  function captureState(){
    if(!motion)return null;
    const source=motion.time,videos=[];
    const add=(video,expectedTime,hold=false)=>{if(video)videos.push({id:video.id,src:video.currentSrc||video.src,expectedTime,hold});};
    if(motion.captureVideo&&Number(motion.captureVideo.style.opacity)>.001&&source<REAL)add(motion.captureVideo,source,story.current.kind==='opener'||story.current.kind==='hold');
    if(real.style.visibility==='visible'&&Number(real.style.opacity)>.001)add(realVideo,desiredTime(realVideo,Math.min(realClockSource,METHOD),REAL),story.realHold());
    if(source>=METHOD&&source<FINALE+.28){
      const local=source-METHOD;
      if(local>stepStarts[2])add(document.querySelector('#reference-policy'),desiredTime(document.querySelector('#reference-policy'),source,methodStarts['reference-policy']));
      if(local>stepStarts[3])add(document.querySelector('#grounded-policy'),desiredTime(document.querySelector('#grounded-policy'),source,methodStarts['grounded-policy']));
    }
    if(source>=FINALE)add(motion.finalVideo,Math.min(source-FINALE,2-1/60));
    for(const extra of story.extra)add(extra.video,extra.expectedTime,extra.hold);
    return{time:projectTime,sourceTime:source,phase:story.current.kind==='opener'?'full-grid-opening':story.current.kind==='hold'?'rl-message-hold':motion.state.phase,clip:story.current.id,videos};
  }
  function driveLive(){
    for(const item of captureState().videos){
      const video=document.getElementById(item.id);if(!video||video.readyState<1)continue;
      if(Math.abs(video.currentTime-item.expectedTime)>(story.current.kind==='hold'?.001:.14)&&!video.seeking)video.currentTime=item.expectedTime;
      if(playing&&!item.hold)video.play().catch(()=>{});else video.pause();
    }
  }
  function renderLive(time){
    projectTime=clamp(time,0,TOTAL);story.current=story.map(projectTime);
    motion.playing=playing&&story.current.kind==='source';
    motion._render(story.current.source);story.present();driveLive();
  }
  async function seek(time){
    if(!motion)return;pause();projectTime=clamp(time,0,TOTAL);story.current=story.map(projectTime);
    await motion.seek(story.current.source,{syncMedia:true});story.present();
    const contract=captureState();
    for(const item of contract.videos){
      const video=document.getElementById(item.id);await motion._seekVideo(video,item.expectedTime);
      if(video.error)throw new Error(`Unable to decode ${video.currentSrc||video.src}`);
    }
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return captureState();
  }
  function togglePlay(){
    if(!motion)return;if(playing){pause();return;}
    if(projectTime>=TOTAL-.02){seek(0).then(togglePlay);return;}
    playing=true;play.textContent='pause';const start=performance.now()-projectTime*1000;
    const tick=now=>{if(!playing)return;renderLive(Math.min(TOTAL,(now-start)/1000));
      if(projectTime>=TOTAL-.001){pause();play.textContent='replay';return;}frameRequest=requestAnimationFrame(tick);};
    frameRequest=requestAnimationFrame(tick);
  }
  async function start(){
    const config=await(await fetch('variant.json',{cache:'no-store'})).json();story=new Run39Story(config);TOTAL=story.duration;
    const content=await(await fetch('content/tasks.json',{cache:'no-store'})).json();
    const rendered=await(await fetch('data/render-manifest.json',{cache:'no-store'})).json();
    const layout=await(await fetch('data/layout.json')).json();
    const tasks=content.tasks.map(task=>{const media=rendered.tasks[task.id];if(!media)return task;
      const featured=content.representative_order.slice(0,4).includes(task.id)&&media.featured;
      const chosen=featured?{...media,...media.featured}:media;return{...task,...chosen,video:chosen.src};});
    motion=new Run39Motion(stage,{...content,tasks,onTime,ease:'camera',liveVideoBudget:12,
      finalLayout:layout,finalGridVideo:'media/all-tasks.mp4',duration:44.25,
      captureMasterURL:'media/opening-master.mp4',
      stateOverride:()=>story.current.kind==='bridge'?story.bridgeState(story.current.local):null});
    story.install(motion,layout,BUILD);
    window.run39Motion=motion;window.run39Story=story;window.run39Variant=config;
    window.run39=new Proxy(motion,{get(target,key){
      if(key==='time')return projectTime;
      if(key==='duration')return TOTAL;
      if(key==='state')return{...target.state,time:projectTime,sourceTime:target.time,phase:story.current.kind==='opener'?'full-grid-opening':target.state.phase};
      const value=target[key];return typeof value==='function'?value.bind(target):value;
    }});
    policyDisclosure=document.createElement('div');policyDisclosure.className='policy-disclosure';policyDisclosure.textContent='simulation rollouts';motion.logical.append(policyDisclosure);
    const stills=await(await fetch('data/stills.json',{cache:'no-store'})).json();
    applyAlpha(document.querySelector('#specify-render'),stills.images.specify);
    applyAlpha(document.querySelector('#retarget-render'),stills.images.retarget);
    applyAlpha(document.querySelector('#reference-policy'),rendered.method_reference);
    applyAlpha(document.querySelector('#grounded-policy'),rendered.tasks['invert-cup']);
    methodMedia={reference:rendered.method_reference,grounded:rendered.tasks['invert-cup']};
    await motion.ready;await document.fonts.ready;await motion.finalIcon.decode();
    await Promise.all(['#specify-render','#retarget-render'].map(selector=>document.querySelector(selector).decode()));
    sizeLayers();scrub.max=String(TOTAL);
    document.querySelector('#easing').disabled=true;document.querySelector('#loading').hidden=true;
    document.title=`DexLink · ${config.label}`;
    await seek(Number(query.get('t')||0));
    window.run39Ready=true;
    if(query.has('autoplay'))togglePlay();
  }
  play.addEventListener('click',togglePlay);document.querySelector('#restart').addEventListener('click',()=>seek(0));
  scrub.addEventListener('input',()=>seek(Number(scrub.value)));
  addEventListener('keydown',event=>{
    if(event.target.matches('input,select'))return;
    if(event.code==='Space'){event.preventDefault();togglePlay();}
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){
      event.preventDefault();const beats=new Set([0,TOTAL]);
      for(const s of story.segments){beats.add(s.start);if(s.kind==='source'){
        for(const source of [2.6,8.5,10.75,12.2,15.95,18.75,24.25,27.25,33.75,35.2,35.7,36.4,38.1,39.25,42.25])
          if(source>=s.source_start&&source<s.source_end)beats.add(s.start+source-s.source_start);
      }}
      const ordered=[...beats].sort((a,b)=>a-b),t=event.key==='ArrowRight'?ordered.find(t=>t>projectTime+.05):ordered.reverse().find(t=>t<projectTime-.05);
      seek(t??(event.key==='ArrowRight'?TOTAL:0));
    }
  });
  window.run39Seek=seek;window.run39CaptureState=captureState;
  window.run39ExportBridgePlan=()=>story.exportBridge();
  start().catch(error=>{document.querySelector('#loading').textContent=error.message;console.error(error);});
})();

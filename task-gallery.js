/* A light carousel: five visible policies on desktop, three on small screens. */
(() => {
  'use strict';
  const viewport=document.querySelector('#task-viewport');if(!viewport)return;
  const world=document.querySelector('#task-world'),category=document.querySelector('#task-category'),search=document.querySelector('#task-search');
  const dialog=document.querySelector('#task-dialog'),dialogVideo=document.querySelector('#task-dialog-video'),pauseButton=document.querySelector('#gallery-pause');
  let tasks=[],selected=[],center=2,entries=new Map(),visible=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pointer=null,drag=0,moved=false,cleanup=null,returnFocus=null;
  const budget=()=>viewport.clientWidth<700?3:5;
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const index=n=>(n+selected.length)%selected.length;
  function stop(entry,release=false){if(!entry.video)return;entry.video.pause();if(release){entry.video.removeAttribute('src');entry.video.load();entry.video.remove();entry.video=null;}}
  function start(entry){
    let video=entry.video;
    if(!video){video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='none';video.setAttribute('aria-hidden','true');video.src=entry.task.video;video.addEventListener('loadeddata',()=>video.classList.add('is-ready'),{once:true});entry.button.insertBefore(video,entry.label);entry.video=video;}
    video.play().catch(()=>{});
  }
  function updateMedia(){
    for(const entry of entries.values()){
      if(entry.active&&visible&&!document.hidden&&!dialog.open){if(paused)stop(entry);else start(entry);}
      else stop(entry);
    }
  }
  function create(task){
    const button=document.createElement('button');button.type='button';button.className='gallery-tile';button.setAttribute('aria-label',task.label);
    const image=document.createElement('img');image.src=task.poster;image.alt='';image.width=640;image.height=400;image.draggable=false;image.decoding='async';
    const label=document.createElement('span');label.className='task-name';label.textContent=task.label;button.append(image,label);world.append(button);
    const entry={task,button,label,video:null,active:false,offset:0};entries.set(task.id,entry);
    button.addEventListener('click',event=>{if(moved&&event.detail!==0){event.preventDefault();return;}if(entry.offset===0)openTask(entry);else go(entry.offset);});
    return entry;
  }
  function distance(i){let d=i-center;while(d>selected.length/2)d-=selected.length;while(d< -selected.length/2)d+=selected.length;return d;}
  function pose(entry,d,dx=0){
    const mobile=viewport.clientWidth<700,w=Math.min(560,viewport.clientWidth*(mobile?.66:.5));
    const a=Math.abs(d),factor=a===0?1:a===1?.68:.42;
    const offset=a===0?0:Math.sign(d)*w*(a===1?(mobile?.58:.74):1.16);
    entry.button.style.width=`${w}px`;entry.button.style.height=`${w*.625+62}px`;
    entry.button.style.transform=`translate(-50%,-50%) translate3d(${offset+dx}px,${a*8}px,0) scale(${factor})`;
    entry.button.style.zIndex=String(10-Math.min(a,4));entry.button.style.opacity=entry.active?(a===0?'1':a===1?'.85':'.62'):'0';
    entry.button.style.pointerEvents=entry.active?'auto':'none';entry.button.tabIndex=entry.active?0:-1;
    entry.button.setAttribute('aria-current',String(d===0));
    entry.button.setAttribute('aria-label',`${entry.task.label}. ${d===0?'Watch larger':'Move to center'}`);
  }
  function layout(direction=0){
    clearTimeout(cleanup);const radius=(budget()-1)/2;
    for(const entry of entries.values())entry.active=false;
    for(let d=-radius;d<=radius;d++){
      if(!selected.length||Math.abs(d)>Math.floor(selected.length/2))continue;
      const task=selected[index(center+d)];if(!task)continue;
      let entry=entries.get(task.id);
      if(!entry){entry=create(task);entry.offset=d;entry.active=false;pose(entry,d+(direction||0),drag);void entry.button.offsetWidth;}
      entry.active=true;entry.offset=d;pose(entry,d,drag);
    }
    for(const entry of entries.values())if(!entry.active){stop(entry);pose(entry,entry.offset-(direction||0),drag);}
    cleanup=setTimeout(()=>{for(const[key,entry]of entries)if(!entry.active){stop(entry,true);entry.button.remove();entries.delete(key);}},550);
    document.querySelector('#gallery-position').value=selected.length?`${center+1} / ${selected.length}`:'0 / 0';
    for(const id of ['#gallery-prev','#gallery-next'])document.querySelector(id).disabled=selected.length<2;
    updateMedia();
  }
  function go(delta){if(selected.length<2)return;center=index(center+delta);drag=0;layout(Math.sign(delta));}
  function filter(){
    const query=search.value.trim().toLocaleLowerCase(),misc=new Set(['wiping','keyboard','mug placement','spoon motions','masher motions','object handling']);
    selected=tasks.filter(t=>(category.value==='all'||t.group===category.value||(category.value==='other'&&misc.has(t.group)))&&`${t.label} ${t.family}`.toLocaleLowerCase().includes(query));
    for(const entry of entries.values()){stop(entry,true);entry.button.remove();}entries.clear();center=category.value==='all'&&!query?Math.min(2,selected.length-1):0;
    document.querySelector('#explorer-count').textContent=`${selected.length} ${selected.length===1?'rollout':'rollouts'}${selected.length!==tasks.length?` of ${tasks.length}`:' · tasks and object variations'}`;
    const message=document.querySelector('#gallery-loading');message.hidden=selected.length>0;message.textContent='No matching behaviors. Try a different task or object.';
    layout();
  }
  function openTask(entry){
    returnFocus=entry.button;document.querySelector('#task-dialog-title').textContent=entry.task.label;
    document.querySelector('#task-dialog-credit').textContent=entry.task.source_credit||(entry.task.group==='arctic'?'Source demonstration: ARCTIC Dataset.':'');
    dialogVideo.poster=entry.task.poster;dialogVideo.src=entry.task.video;dialog.showModal();updateMedia();dialogVideo.play().catch(()=>{});
  }
  dialog.addEventListener('close',()=>{dialogVideo.pause();dialogVideo.removeAttribute('src');dialogVideo.load();returnFocus?.focus({preventScroll:true});updateMedia();});
  document.querySelector('#task-dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}});
  document.querySelector('#gallery-prev').addEventListener('click',()=>go(-1));document.querySelector('#gallery-next').addEventListener('click',()=>go(1));
  pauseButton.textContent=paused?'Play':'Pause';pauseButton.setAttribute('aria-pressed',String(paused));
  pauseButton.addEventListener('click',()=>{paused=!paused;pauseButton.textContent=paused?'Play':'Pause';pauseButton.setAttribute('aria-pressed',String(paused));updateMedia();});
  category.addEventListener('change',filter);search.addEventListener('input',filter);
  viewport.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();go(e.key==='ArrowLeft'?-1:1);}});
  viewport.addEventListener('pointerdown',e=>{if(e.button&&e.pointerType==='mouse')return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};drag=0;moved=false;});
  viewport.addEventListener('pointermove',e=>{
    if(!pointer||pointer.id!==e.pointerId)return;
    const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
    if(!moved&&Math.abs(dy)>Math.abs(dx)+8){pointer=null;return;}
    if(Math.abs(dx)>8){moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');drag=clamp(dx,-350,350);for(const entry of entries.values())if(entry.active)pose(entry,entry.offset,drag);}
  });
  function release(e){if(!pointer||pointer.id!==e.pointerId)return;pointer=null;viewport.classList.remove('is-dragging');const shift=drag;drag=0;if(moved&&Math.abs(shift)>35)go(shift<0?1:-1);else layout();}
  viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',()=>{pointer=null;drag=0;viewport.classList.remove('is-dragging');layout();});
  new IntersectionObserver(items=>{visible=items[0].isIntersecting;updateMedia();},{threshold:.05}).observe(viewport);
  new ResizeObserver(()=>{if(tasks.length)layout();}).observe(viewport);document.addEventListener('visibilitychange',updateMedia);
  window.dexlinkGallery={get state(){return{tasks:tasks.length,filtered:selected.length,centerIndex:center,centerId:selected[center]?.id,liveVideos:[...entries.values()].filter(e=>e.video&&!e.video.paused).length,loadedVideos:[...entries.values()].filter(e=>e.video).length,cards:entries.size,budget:budget(),paused,visible,dialog:dialog.open};},go};
  fetch('assets/renders/catalog.json').then(r=>{if(!r.ok)throw new Error('Could not load the task collection.');return r.json();}).then(data=>{tasks=data.tasks;filter();window.dexlinkGallery.ready=true;}).catch(error=>{document.querySelector('#gallery-loading').textContent=`${error.message} Reload to try again.`;console.error(error);});
})();

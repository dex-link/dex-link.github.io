(() => {
  const query=new URLSearchParams(location.search);
  if(query.has('clean'))document.body.classList.add('clean');
  const frame=document.querySelector('#native-deck'),play=document.querySelector('#play'),scrub=document.querySelector('#scrub');
  let view,tag,config,subtitleState,holdMessage;
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  const status=()=>({time:view?.run39?.time||0,duration:view?.run39?.duration||51.208333333333336,
    playing:view?.document.querySelector('#play')?.textContent==='pause',tag:tag?.state,opening:config?.opening,subtitle:subtitleState,message:holdMessage?.state});
  function sync(){const s=status();scrub.value=s.time;document.querySelector('#time').textContent=`${s.time.toFixed(2)} / ${s.duration.toFixed(2)} s`;play.textContent=view.document.querySelector('#play').textContent;}
  async function seek(time){if(!view||!tag)return;await view.run39Seek(time);sync();return status();}
  function toggle(){if(!view||!tag)return;view.document.querySelector('#play').click();sync();}
  async function start(){
    config=await(await fetch('variant.json',{cache:'no-store'})).json();
    await new Promise(resolve=>{const check=()=>{if(frame.contentWindow.run39Ready)resolve();else setTimeout(check,50);};check();});
    view=frame.contentWindow;
    const css=view.document.createElement('link');css.rel='stylesheet';css.href=new URL('tag.css',location.href).href;
    const styled=new Promise((resolve,reject)=>{css.onload=resolve;css.onerror=reject;});view.document.head.append(css);await styled;
    await view.document.fonts.load('400 32px "Roboto Mono"');await view.document.fonts.ready;
    const script=view.document.createElement('script');script.src=new URL('tag.js',location.href).href;
    const loaded=new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=reject;});view.document.body.append(script);await loaded;
    const messageScript=view.document.createElement('script');messageScript.src=new URL('hold-message.js',location.href).href;
    const messageLoaded=new Promise((resolve,reject)=>{messageScript.onload=resolve;messageScript.onerror=reject;});view.document.body.append(messageScript);await messageLoaded;
    const motion=view.run39Motion,story=view.run39Story,openingSeconds=config.opening_seconds;
    motion.finalSubtitle.firstElementChild.textContent='synthesizing dexterous behaviors from';
    motion.introFramework.textContent='generating';
    // The complete subtitle stays with the opening; there is no diversity footer.
    const diverse=view.document.createElement('span');diverse.className='r42-v5-diverse-word';diverse.textContent='diverse';
    motion.introGenerating.replaceChildren(diverse,view.document.createTextNode(' dexterous behaviors'));
    const simulation=view.document.createElement('span');simulation.className='r42-v5-simulation-word';simulation.textContent=' in simulation';
    motion.introGenerating.append(simulation);const simulationWidth=simulation.offsetWidth;
    const caret=view.document.createElement('i');caret.className='r42-v5-subtitle-caret';caret.setAttribute('aria-hidden','true');motion.logical.append(caret);
    const textMeasure=view.document.createElement('canvas').getContext('2d');
    const prefixText='generating',mainText='diverse dexterous behaviors in simulation';
    const fullText=prefixText+' '+mainText;
    let subtitleRight=null;
    function width(node,text){const style=view.getComputedStyle(node);textMeasure.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;return textMeasure.measureText(text).width+Math.max(0,text.length-1)*(parseFloat(style.letterSpacing)||0);}
    function typeSubtitle(local,opening){
      const progress=opening?clamp((local-.15)/2.1):1;
      const count=Math.floor(fullText.length*progress+1e-7);
      const prefixCount=Math.min(prefixText.length,count),mainCount=Math.max(0,count-prefixText.length-1);
      const prefixWidth=width(motion.introFramework,prefixText.slice(0,prefixCount));
      const mainWidth=width(motion.introGenerating,mainText.slice(0,mainCount));
      for(const[node,reveal]of[[motion.introFramework,prefixWidth],[motion.introGenerating,mainWidth]]){
        node.style.clipPath=progress<1?`inset(0 ${Math.max(0,node.scrollWidth-reveal-(reveal>0?1:0))}px 0 0)`:'none';
      }
      const visible=opening&&local>=.15&&local<2.42;
      const node=count<=prefixText.length?motion.introFramework:motion.introGenerating;
      const reveal=count<=prefixText.length?prefixWidth:mainWidth;
      const matrix=new view.DOMMatrixReadOnly(view.getComputedStyle(node).transform);
      if(subtitleRight===null){const end=new view.DOMMatrixReadOnly(view.getComputedStyle(motion.introGenerating).transform);subtitleRight=end.m41+width(motion.introGenerating,mainText)*end.a;}
      const shift=opening&&progress<1?subtitleRight-(matrix.m41+reveal*matrix.a):0;
      for(const part of [motion.introFramework,motion.introGenerating]){
        const transform=new view.DOMMatrix(view.getComputedStyle(part).transform);transform.m41+=shift;part.style.transform=transform.toString();
      }
      caret.style.transform=`translate3d(${subtitleRight+3}px,${matrix.m42+4}px,0) scale(${matrix.a})`;
      caret.style.opacity=visible?'0.9':'0';
      subtitleState={progress,count,text:fullText.slice(0,count),caret:visible,cursorX:subtitleRight+3,textShift:shift,diverseColor:view.getComputedStyle(diverse).color};
    }
    tag=new view.ExamplePolicyTag(motion.logical,{oldLabel:view.document.querySelector('.policy-disclosure'),rateLabel:motion.rate,text:config.sticker_text,openingSeconds});
    holdMessage=new view.RLHoldMessage(motion.logical,config.transition_message);
    tag.root.style.display='none';motion.rate.style.top='25px';
    function colorCompositionWords(){
      if(motion.state.phase!=='composition')return;
      const state=motion.state,full=motion.config.composition_prefix;
      const first=motion.sections[state.section.index-1]?.kind!=='composition';
      // Fit the sentence and four action beats into the existing first slide.
      const start=.16,duration=state.section.seconds-1.35,end=start+duration;
      const count=first?Math.ceil(full.length*clamp((state.localTime-start)/duration)):full.length;
      const text=full.slice(0,count),fragment=view.document.createDocumentFragment();
      // Fit the complete sentence before typing, keeping its size and left edge
      // stable as letters appear. The CSS variable only applies to composition.
      const ctx=motion.textMeasure||view.document.createElement('canvas').getContext('2d');
      ctx.font='400 54px "IBM Plex Sans"';
      const measured=ctx.measureText(full).width-(full.length-1)*54*.024;
      const fontSize=Math.floor(Math.min(54,1480/measured*54)*2)/2;
      motion.controlLine.style.setProperty('--composition-font-size',`${fontSize}px`);
      for(const part of text.split(/(\b(?:compose|continuous)\b)/)){
        if(!part)continue;
        if(/^(compose|continuous)$/.test(part)){
          const word=view.document.createElement('span');word.className='r42-composition-keyword';word.textContent=part;fragment.append(word);
        }else fragment.append(view.document.createTextNode(part));
      }
      motion.controlPrefix.replaceChildren(fragment);
      motion.controlPrefix.dataset.typing=String(first&&state.localTime>=start&&state.localTime<end);
      if(first){
        motion.actionNodes.forEach((node,index)=>{
          const shown=state.localTime+1e-8>=end+.09+index*.28;
          node.style.opacity=shown?'1':'0';node.dataset.shown=String(shown);
        });
      }
    }
    const present=story.present.bind(story);
    story.present=function(){
      const actual=story.current,isOpening=actual.kind==='opener';
      simulation.style.width=isOpening?`${simulationWidth}px`:'0px';simulation.style.opacity=isOpening?'1':'0';
      if(isOpening)story.current={...actual,local:actual.local<openingSeconds-1?Math.min(actual.local,1.999):2+actual.local-(openingSeconds-1)};
      else motion._hud(motion.state);
      present();story.current=actual;
      // Keep the centered opening geometry while the gallery begins its zoom.
      // Its captions are absent, so the title/subtitle should fade, never dock.
      if(isOpening)motion._hud({...motion.state,phase:'introduction',time:1});
      typeSubtitle(actual.local,isOpening);
      tag.update(view.run39.time,{sourceTime:motion.time,opening:isOpening,phase:motion.state.phase});
      tag.root.style.display='none';tag.state.visible=false;tag.state.opacity=0;motion.rate.style.top='25px';
      const isHold=actual.kind==='hold';
      const messageExit=config.transition_message.enabled!==false&&actual.kind==='bridge'&&actual.local<config.transition_message.fade_out_seconds;
      holdMessage.update(isHold?actual.local:config.transition_message.seconds+actual.local,isHold||messageExit);
      holdMessage.state.sourceFrozen=isHold;
      // De-emphasize the smaller repeated captions while the statement is read.
      const cover=isHold?ease(actual.local/.18)*(1-ease((actual.local-3.75)/.25)):0;
      // Fade with the opening wash; keep the separate control line unchanged.
      const diversityAlpha=isOpening?Number(story.galleryWash.style.opacity):0;
      motion.introBrand.style.opacity=motion.introDescription.style.opacity=String(diversityAlpha);
      if(isHold){
        motion.rate.style.opacity=String(Number(motion.rate.style.opacity)*(1-cover));
        tag.root.style.opacity=String(tag.state.opacity*(1-cover));tag.state.opacity*=1-cover;
      }
      colorCompositionWords();
      sync();
    };
    frame.style.visibility='visible';document.querySelector('#loading').hidden=true;scrub.max=view.run39.duration;
    await seek(Number(query.get('t')||0));window.run42Ready=true;document.title='DexLink · '+config.label;
    if(query.has('autoplay'))toggle();
  }
  play.onclick=toggle;document.querySelector('#restart').onclick=()=>seek(0);
  document.querySelector('#message-preview').onclick=async()=>{await seek(config.transition_message.enabled===false?0:config.transition_message.start_seconds);toggle();};
  let pending=null,seeking=false;
  scrub.oninput=async()=>{pending=Number(scrub.value);if(seeking)return;seeking=true;try{while(pending!==null){const time=pending;pending=null;await seek(time);}}finally{seeking=false;}};
  addEventListener('keydown',event=>{if(event.target.matches('input')||!view)return;if(event.code==='Space'){event.preventDefault();toggle();}else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();view.dispatchEvent(new view.KeyboardEvent('keydown',{key:event.key,code:event.code,bubbles:true}));}});
  window.run42Seek=seek;window.run42State=status;window.run42Toggle=toggle;
  start().catch(error=>{document.querySelector('#loading').textContent=String(error.message||error);console.error(error);});
})();

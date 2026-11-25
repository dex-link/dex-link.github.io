/* Persistent native-aspect video tiles and an explicit physical camera timeline.
 * Public API: new Run39Motion(stage, config); await instance.ready;
 * await instance.seek(seconds, {syncMedia:true}); instance.play()/pause().
 * Source posters always remain beneath videos until a decoded frame is ready.
 * Config/onTime owns the method overlay; this engine never edits its markup.
 */
(function (global) {
  'use strict';
  const W = 1600, H = 900;
  const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
  const mix = (a, b, t) => a + (b - a) * t;
  const cameraEase = t => { t = clamp(t); return t * t * t * (10 + t * (-15 + 6 * t)); };
  const glideEase = t => { t = clamp(t); const k = 7; return (1 - (1 + k * t) * Math.exp(-k * t)) / (1 - (1 + k) * Math.exp(-k)); };
  const interpolatePose = (a, b, p) => ({ x: mix(a.x, b.x, p), y: mix(a.y, b.y, p), s: Math.exp(mix(Math.log(Math.max(a.s, .0001)), Math.log(Math.max(b.s, .0001)), p)), opacity: mix(a.opacity ?? 1, b.opacity ?? 1, p) });
  function element(tag, className, parent) { const item = document.createElement(tag); if (className) item.className = className; if (parent) parent.append(item); return item; }
  const isFeature=state=>state.phase==='control'||state.phase==='composition';

  function nestedCells(maximum, stages = [1, 2, 4, 6]) {
    const result = [], taken = new Set();
    for (const n of [...stages, Math.ceil(Math.sqrt(maximum))]) {
      for (let row = 0; row < n; row += 1) for (let col = 0; col < n; col += 1) {
        const key = `${row}:${col}`;
        if (!taken.has(key)) { result.push([row, col]); taken.add(key); }
        if (result.length >= maximum) return result;
      }
    }
    return result;
  }

  function gridPoses(ids, count, size = Math.ceil(Math.sqrt(count)), customCells) {
    const cells = customCells || nestedCells(count);
    const occupied=cells.slice(0,count);
    const columns=Math.max(...occupied.map(cell=>cell[1]))+1;
    const rows=Math.max(...occupied.map(cell=>cell[0]))+1;
    const cellW = W / Math.max(size,columns,rows);
    const cellH = cellW * 9 / 16;
    const top = 0;
    const result = new Map();
    ids.slice(0, count).forEach((id, i) => {
      const [row, col] = cells[i];
      result.set(id, { x: col * cellW, y: row * cellH + top, s: cellW / W, opacity: 1 });
    });
    return result;
  }

  class Run39Motion {
    constructor(stage, config = {}) {
      if (!(stage instanceof Element)) throw new TypeError('Run30Motion expects a stage element');
      this.stage = stage;
      this.config = config;
      this.tasks = new Map((config.tasks || []).map(task => [task.id, {...task}]));
      if (!this.tasks.size) throw new Error('Run30Motion needs at least one task');
      this.order = config.representative_order || config.diversityIds || Array.from(this.tasks.keys()).slice(0, 36);
      for (const id of this.order) if (!this.tasks.has(id)) throw new Error(`Unknown representative task: ${id}`);
      this.allOrder = [...this.order, ...Array.from(this.tasks.keys()).filter(id => !this.order.includes(id))];
      this.easeName = config.ease || 'camera';
      this.playbackRate = config.playbackRate ?? 2;
      this.maxLiveVideos = config.maxLiveVideos ?? config.liveVideoBudget ?? 12;
      this.time = 0; this.playing = false; this.entries = new Map(); this.destroyed = false;
      this._raf = null; this._phaseKey = ''; this._lastMediaSeek = new Map();
      this._timeline(); this._build(); this._resize();
      this.resizeObserver = new ResizeObserver(() => this._resize());
      this.resizeObserver.observe(stage);
      this.ready = this._prepareInitial();
      this._render(0);
    }

    _timeline() {
      const timing = this.config.timing || {};
      this.duration = Number(timing.duration ?? timing.total_seconds ?? this.config.duration ?? 44.25);
      this.methodStart = Number(timing.methodStart ?? timing.method_start ?? this.config.methodStart ?? 30);
      this.methodMiddle = Number(timing.methodMiddle ?? timing.method_middle ?? 35);
      this.realStart = Number(timing.realStart ?? this.config.realStart ?? 30);
      this.controlEnd = Number(timing.controlEnd ?? this.realStart);
      this.finaleStart = Number(timing.finaleStart ?? timing.finale_start ?? this.config.finaleStart ?? 40);
      this.controlStart = Number(timing.controlStart ?? timing.control_start ?? this.config.controlStart ?? timing.diversityEnd ?? (timing.variations_seconds ? this.methodStart-timing.variations_seconds : 11.2));
      this.introDockEnd = Number(timing.introDockEnd ?? 2.55);
      this.introDockStart = Number(timing.introDockStart ?? 1.55);
      let timedExpansions=null;
      if(timing.grid_expansion_seconds){
        let at=Number(timing.introduction_seconds||2)+Number(timing.single_demo_seconds||2.1);
        timedExpansions=[{time:0,count:1}];
        (this.config.expansion_counts||[1,4,16,36]).slice(1).forEach((count,i)=>{
          timedExpansions.push({time:at,count:Math.min(count,this.order.length),transition:timing.grid_expansion_seconds[i]||1.2});
          at+=timing.grid_expansion_seconds[i]||1.2;
        });
      }
      this.expansions = timing.expansions || timedExpansions || [
        {time: 0, count: 1}, {time: 3.6, count: Math.min(4, this.order.length)},
        {time: 5.8, count: Math.min(16, this.order.length)},
        {time: 8.0, count: Math.min(36, this.order.length)},
        {time: 10.0, count: this.order.length},
      ];
      this.expansions = this.expansions.filter((item, index, all) => !index || item.count !== all[index - 1].count);
      this.cells = nestedCells(this.order.length);
      this.base = gridPoses(this.order, this.order.length, Math.ceil(Math.sqrt(this.order.length)), this.cells);
      this.baseCamera = {cx: W / 2, cy: H / 2, zoom: 1};
      this.diversityStart=Number(timing.grid_broaden_start??timing.diversityStart??this.introDockEnd);
      this.diversityEnd=Number(timing.grid_broaden_end??timing.diversityEnd??Math.min(8.3,this.controlStart));
      this.diversityZoom=Math.ceil(Math.sqrt(this.order.length));
      this.diversityRevealTimes=new Map(this.order.map((id,index)=>{
        if(index===0)return[id,this.introDockStart];
        const pose=this.base.get(id);
        const entryZoom=Math.min(pose.x>0?W/pose.x:Infinity,pose.y>0?H/pose.y:Infinity);
        if(entryZoom>=this.diversityZoom)return[id,this.diversityStart];
        let lo=this.diversityStart,hi=this.diversityEnd;
        for(let i=0;i<40;i++){
          const mid=(lo+hi)/2;
          if(this._diversityCamera(mid).zoom>entryZoom)lo=mid;else hi=mid;
        }
        return[id,hi];
      }));
      const sections = this.config.variations || [...(this.config.controlSections || []), ...(this.config.variationSections || [])];
      const weight = sections.reduce((sum, section) => sum + Number(section.seconds || 2.8), 0) || 1;
      let cursor = this.controlStart;
      this.sections = sections.map((section, index) => {
        const seconds = Number(section.seconds || 2.8) / weight * (this.controlEnd - this.controlStart);
        const ids = section.task_ids || section.taskIds || [];
        ids.forEach(id => { if (!this.tasks.has(id)) throw new Error(`Unknown variation task: ${id}`); });
        const normalized = {...section, ids, index, start: cursor, end: cursor + seconds, seconds};
        normalized.snapshot = this._variationSnapshot(normalized);
        cursor += seconds;
        return normalized;
      });
      this.finalCells = nestedCells(this.allOrder.length);
      this.finalPoses = gridPoses(this.allOrder, this.allOrder.length, Math.ceil(Math.sqrt(this.allOrder.length)), this.finalCells);
      const finalLayout=this.config.finalLayout;
      if(finalLayout?.tasks){
        const rectangles=Array.isArray(finalLayout.tasks)?finalLayout.tasks:Object.entries(finalLayout.tasks).map(([id,rect])=>({id,...rect}));
        const normalized=rectangles.every(rect=>rect.width<=1&&rect.height<=1);
        const sourceWidth=Number(finalLayout.width||finalLayout.canvas?.width||1920),sourceHeight=Number(finalLayout.height||finalLayout.canvas?.height||1080);
        for(const rect of rectangles){
          if(!this.tasks.has(rect.id))continue;
          const x=rect.x*(normalized?W:W/sourceWidth),y=rect.y*(normalized?H:H/sourceHeight),width=rect.width*(normalized?W:W/sourceWidth);
          this.finalPoses.set(rect.id,{x,y,s:width/W,opacity:1});
        }
        this.finalPhases=new Map((finalLayout.cells||[]).filter(cell=>cell.id||cell.task_id).map(cell=>[cell.id||cell.task_id,Number(cell.source_phase_seconds||0)]));
      }
    }

    _variationSnapshot(section) {
      const anchorId = section.anchor_id || section.representative_id || section.ids.find(id => this.base.has(id)) || this.order.find(id => this.tasks.get(id).family === this.tasks.get(section.ids[0])?.family) || this.order[0];
      const anchor = this.base.get(anchorId) || this.base.values().next().value;
      const count = section.ids.length;
      const cols = Number(section.columns || (count <= 2 ? 2 : count <= 6 ? 3 : Math.ceil(Math.sqrt(count))));
      const rows = Math.ceil(count / cols);
      const cellW = W / Math.ceil(Math.sqrt(this.order.length));
      const cellH = cellW * 9 / 16;
      const poses = new Map(this.base);
      for (const [id, pose] of poses) poses.set(id, {...pose, opacity: 0});
      section.ids.forEach((id, i) => {
        const row=Math.floor(i/cols),lastCount=count-(rows-1)*cols;
        const centered=section.kind==='composition'&&row===rows-1?(cols-lastCount)/2:0;
        poses.set(id,{x:anchor.x+((i%cols)+centered)*cellW,y:anchor.y+row*cellH,s:cellW/W,opacity:1});
      });
      if(section.kind==='composition'){
        const zoom=Math.min((W-60)/(cols*cellW),590/(rows*cellH));
        return {poses,camera:{cx:anchor.x+cols*cellW/2,
          cy:anchor.y+rows*cellH/2+(H/2-385)/zoom,zoom},anchorId};
      }
      const zoom = Math.min(W / (cols * cellW), (H - 108) / (rows * cellH));
      return {poses, camera: {cx: anchor.x + cols * cellW / 2, cy: anchor.y + rows * cellH / 2 + 24 / zoom, zoom}, anchorId};
    }

    _build() {
      this.stage.classList.add('r30-stage');
      this.logical = element('div', 'r30-logical', this.stage);
      if(this.config.captureMasterURL){
        this.captureVideo=element('video','r32-capture-master',this.logical);
        this.captureVideo.id='opening-master';
        this.captureVideo.muted=true;this.captureVideo.playsInline=true;
        this.captureVideo.preload='auto';this.captureVideo.src=this.config.captureMasterURL;
      }
      this.world = element('div', 'r30-world', this.logical);
      this.camera = element('div', 'r30-camera', this.world);
      for (const [id, task] of this.tasks) {
        const tile = element('figure', 'r30-tile', this.camera); tile.dataset.task = id;
        const image = element('img', '', tile); image.alt = task.label || ''; image.decoding = 'async';
        if (task.poster&&!this.captureVideo) image.src = task.poster;
        const caption = element('figcaption', '', tile);
        const label = element('span', 'r30-task-label', caption); label.textContent = task.label || '';
        const qualifier = element('span', 'r30-label-qualifier', caption);
        this.entries.set(id, {id, task, tile, image, caption, label, qualifier, video: null, live: false, impact: null});
      }
      if (this.config.finalGridVideo) {
        this.finalVideo = element('video', 'r30-final-video', this.logical);
        this.finalVideo.muted = true; this.finalVideo.playsInline = true; this.finalVideo.loop = true;
        this.finalVideo.preload = 'auto'; this.finalVideo.src = this.config.finalGridVideo;
        this.finalVideo.id='final-grid';
      }
      this.footerWash = element('div', 'r30-footer-wash', this.logical);
      this.introBrand = element('div', 'r30-intro-part r30-intro-brand', this.logical);
      this.introIntroducing=element('span','r33-intro-fragment r33-introducing',this.introBrand);
      this.introIntroducing.textContent='introducing';
      this.introDex=element('span','r33-intro-fragment r30-brand-word',this.introBrand);
      this.introDex.textContent='DexLink';
      this.introDescription = element('div', 'r30-intro-part r30-intro-description', this.logical);
      this.introFramework=element('span','r33-intro-fragment r33-framework',this.introDescription);
      this.introFramework.textContent='a generator of';
      this.introGenerating=element('span','r33-intro-fragment r33-generating',this.introDescription);
      this.introGenerating.textContent='diverse dexterous behaviors.';
      this.introAllows=element('span','r33-intro-fragment r33-allows',this.introDescription);
      this.introAllows.textContent='generates';
      this.controlLine = element('div', 'r30-control-line', this.logical);
      this.controlPrefix = element('span', 'r32-control-prefix', this.controlLine); this.controlPrefix.textContent = 'DexLink provides control over ';
      this.axisWord = element('span', 'r30-axis-word', this.controlLine);
      this.cursor = element('i', 'r30-type-cursor', this.controlLine); this.cursor.setAttribute('aria-hidden', 'true');
      this.credit = element('div', 'r30-credit', this.logical);
      this.rate = element('div', 'r30-rate', this.logical);
      this.phaseLabel = element('div', 'r30-phase-label', this.logical);
      this.finalTitle = element('div', 'r30-final-title', this.logical);
      this.finalLockup = element('div', 'r39-brand-lockup', this.finalTitle);
      this.finalIcon = element('img', 'r39-brand-icon', this.finalLockup);
      this.finalIcon.src='images/icon.png';
      this.finalIcon.alt='Robotic grasp with object waypoints';
      this.finalDivider = element('div', 'r39-brand-divider', this.finalLockup);
      this.finalDivider.setAttribute('aria-hidden','true');
      this.finalText = element('div', 'r39-brand-text', this.finalLockup);
      this.finalWordmark = element('h1', '', this.finalText);
      this.finalWordmark.textContent = 'DexLink';
      this.finalSubtitle = element('p', 'r39-brand-subtitle', this.finalText);
      element('span','',this.finalSubtitle).textContent='synthesizing dexterous demonstrations from';
      element('span','',this.finalSubtitle).textContent='chained hand–object poses';
    }

    _resize() {
      const scale = this.stage.clientWidth / W;
      this.logical.style.transform = `scale(${scale})`;
    }

    async _prepareInitial() {
      const images = this.order.slice(0, Math.min(36, this.order.length)).map(id => {
        const img = this.entries.get(id).image;
        return img.complete ? Promise.resolve() : new Promise(resolve => { img.addEventListener('load', resolve, {once:true}); img.addEventListener('error', resolve, {once:true}); setTimeout(resolve, 5000); });
      });
      await Promise.all(images);
      if(!this.captureVideo)for (const id of this.order.slice(0, 4)) this._ensureVideo(this.entries.get(id));
      return this.seek(this.time, {syncMedia:true});
    }

    _ensureVideo(entry) {
      if (!entry.task.video || entry.video) return entry.video;
      const video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.preload = 'auto'; video.loop = true;
      video.src = entry.task.video; video.dataset.present = 'false';
      video.addEventListener('loadeddata', () => { if (video.readyState >= 2) video.dataset.present = 'true'; });
      video.addEventListener('error', () => { video.dataset.present = 'false'; entry.mediaError = true; });
      entry.tile.insertBefore(video, entry.caption); entry.video = video;
      this._applyMediaPadding(entry);
      return video;
    }

    _ease(value) { return this.easeName === 'glide' ? glideEase(value) : cameraEase(value); }

    _diversityCamera(t){
      // Keep the pullback moving. Control takes over before this camera could
      // reach its wide endpoint, without an ease-out or a settled-grid hold.
      const progress=clamp((t-this.diversityStart)/(this.diversityEnd-this.diversityStart));
      const zoom=Math.exp(mix(Math.log(this.diversityZoom),0,progress));
      return{cx:W/(2*zoom),cy:H/(2*zoom),zoom};
    }

    _gridState(t) {
      // Every task occupies its final cell throughout the pullback. The single
      // camera reveals the existing scene instead of rearranging media slots.
      const poses=new Map(),camera=this._diversityCamera(t);
      const neighborAlpha=this._ease((t-this.diversityStart)/.32);
      for(const[id,pose]of this.base)poses.set(id,{...pose,opacity:id===this.order[0]?1:neighborAlpha});
      if(t<this.introDockEnd){
        const entry=this._ease((t-this.introDockStart)/(this.introDockEnd-this.introDockStart));
        const pose=poses.get(this.order[0]);
        poses.set(this.order[0],{...pose,x:pose.x+(1-entry)*W*1.02/this.diversityZoom,
          y:pose.y+(1-entry)*H*.08/this.diversityZoom,s:pose.s*(.84+.16*entry)});
      }
      const count=this.order.filter(id=>t>=this.diversityRevealTimes.get(id)).length;
      return{poses,camera,phase:t<this.introDockEnd?'introduction':'diversity',gridCount:count,
        progress:clamp((t-this.diversityStart)/(this.diversityEnd-this.diversityStart))};
    }

    _between(a, b, p, bridge = false) {
      const poses = new Map();
      for (const id of new Set([...a.poses.keys(), ...b.poses.keys()])) {
        const from = a.poses.get(id) || {...b.poses.get(id), s: b.poses.get(id).s * .35, opacity: 0};
        const to = b.poses.get(id) || {...a.poses.get(id), s: a.poses.get(id).s * .35, opacity: 0};
        poses.set(id, interpolatePose(from, to, p));
      }
      let zoom = Math.exp(mix(Math.log(a.camera.zoom), Math.log(b.camera.zoom), p));
      if (bridge) zoom *= Math.exp(-Math.sin(Math.PI * p) * .56);
      return {poses, camera: {cx:mix(a.camera.cx,b.camera.cx,p), cy:mix(a.camera.cy,b.camera.cy,p), zoom}};
    }

    stateAt(seconds) {
      const override=this.config.stateOverride?.(seconds,this);
      if(override)return override;
      const t = clamp(Number(seconds), 0, this.duration);
      if (t < this.controlStart || !this.sections.length && t < this.methodStart) return {...this._gridState(t), time:t};
      if (t < this.controlEnd) {
        const section = this.sections.find(item => t >= item.start && t < item.end) || this.sections[this.sections.length - 1];
        // The first zoom inherits the moving pullback, including its velocity.
        // Using the parked base camera here would snap at the early handoff.
        const previous = section.index ? this.sections[section.index - 1].snapshot : this._gridState(t);
        const p = this._ease((t - section.start) / Math.min(.82, section.seconds * .32));
        return {...this._between(previous, section.snapshot, p, section.index > 0), phase:section.kind==='composition'?'composition':'control', section, sectionIndex:section.index, progress:p, localTime:t-section.start, time:t};
      }
      if(t<this.methodStart)return{poses:new Map(),camera:this.baseCamera,phase:'real-world',time:t};
      if (t < this.finaleStart) {
        const anchor = this.base.get('invert-cup') || this.base.values().next().value;
        const methodCamera = {cx:anchor.x + W * anchor.s / 2, cy:anchor.y + H * anchor.s / 2, zoom:1/anchor.s};
        const previous = this.sections.length ? this.sections[this.sections.length-1].snapshot : {poses:this.base,camera:this.baseCamera};
        return {...this._between(previous, {poses:this.base,camera:methodCamera}, this._ease((t-this.methodStart)/1.1)),
                phase:t<this.methodMiddle?'method-input':'method-overview', time:t, methodLocal:t-this.methodStart,
                worldExit:this._ease((t-this.methodStart)/1.35), progress:clamp((t-this.methodStart)/(this.finaleStart-this.methodStart))};
      }
      const p=this._ease((t-this.finaleStart)/.28);
      return {poses:new Map(),camera:this.baseCamera,phase:'finale',time:t,progress:p,
              titleAlpha:this._ease((t-this.finaleStart)/.95)};
    }

    _typedAxis(state) {
      if (!isFeature(state)) return '';
      const section = state.section;
      const next = section.typed_axis || section.title || 'generated behaviors';
      const prior=this.sections[section.index-1];
      const previous = prior&&prior.kind===section.kind ? prior.typed_axis || prior.title : '';
      const local = state.localTime;
      const erase = .24, type = Math.min(.62, section.seconds * .23);
      if (local < erase && previous) return previous.slice(0, Math.ceil(previous.length * (1-local/erase)));
      return next.slice(0, Math.ceil(next.length * clamp((local-erase)/type)));
    }

    _mediaTime(entry, state) {
      const video = entry.video;
      const duration = Number(entry.task.duration || (video && Number.isFinite(video.duration) ? video.duration : 0));
      let rate = Number(state.section?.playback_rate ?? entry.task.playback_rate ?? this.playbackRate);
      let elapsed = state.time;
      const reveal=this.diversityRevealTimes.get(entry.id);
      if(reveal!==undefined)elapsed=Math.max(0,state.time-reveal);
      let freeze = false,waiting=false;
      if(state.phase==='finale'&&duration>0&&this.finalPhases?.has(entry.id)){
        const raw=this.finalPhases.get(entry.id)+Math.max(0,state.time-this.finaleStart);
        return{time:raw%duration,rate:1,raw,duration,hold:false};
      }
      if (isFeature(state) && state.section.ids.includes(entry.id)) {
        const section = state.section;
        const i = section.ids.indexOf(entry.id);
        const reveal = Math.min(.82, section.seconds * .32) * .55;
        elapsed = Math.max(0, state.localTime - reveal);
        if (['insertion','extraction','bimanual'].includes(section.id) || section.time_compressed === true) {
          const window=Math.max(.4,section.seconds-reveal-.04);
          const raw=duration*clamp(elapsed/window);
          rate=duration>0?Math.min(16,duration/window):rate;
          return {time:Math.min(raw,Math.max(0,duration-1/60)),rate,raw,duration,hold:raw>=duration,compressed:true,loop:false};
        }
        if (section.presentation === 'sequential' || section.sequence === true || section.playback_mode?.includes('sequential') || section.id === 'timing' || section.id === 'strategy') {
          const firstEntry = this.entries.get(section.ids[0]);
          const firstDuration = Number(firstEntry?.task.duration || firstEntry?.video?.duration || section.first_duration || Math.max(1, (section.seconds-reveal)*rate/2));
          if (i > 0) {waiting=elapsed<firstDuration/rate;elapsed = Math.max(0, elapsed - firstDuration / rate);}
          freeze = elapsed * rate >= (i===0?firstDuration:duration);
        }
      }
      const raw = Math.max(0, elapsed * rate);
      const feature=isFeature(state)&&state.section.ids.includes(entry.id);
      const once=(feature&&state.section.loop!==true)||state.section?.loop===false||entry.task.loop===false;
      const hold=freeze||(once&&duration>0&&raw>=duration);
      return {time:duration>0 ? once||freeze ? Math.min(raw,Math.max(0,duration-1/60)) : raw % duration : 0, rate, raw, duration, hold,waiting,loop:!once};
    }

    _render(t, options = {}) {
      if (this.destroyed) return null;
      const state = this.stateAt(t); this.time = state.time;
      this.state = state;
      const {camera} = state;
      const tx = W/2-camera.cx*camera.zoom, ty = H/2-camera.cy*camera.zoom;
      this.camera.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${camera.zoom})`;
      this.world.style.transform = `translate3d(${state.phase.startsWith('method') ? -W*state.worldExit : state.worldEnter || 0}px,0,0)`;
      this.world.style.opacity = state.phase==='real-world'||state.phase==='finale'||state.phase.startsWith('method') ? '0' : '1';
      const captured=!!this.captureVideo&&state.time<this.controlEnd;
      if(this.captureVideo){
        this.captureVideo.style.opacity=captured?'1':'0';
        if(captured&&this.playing)this.captureVideo.play().catch(()=>{});else this.captureVideo.pause();
      }
      const ranked = [];
      for (const [id, entry] of this.entries) {
        const pose = state.poses.get(id);
        if (!pose || pose.opacity < .001) { entry.tile.style.visibility='hidden'; if(entry.video) entry.video.pause(); continue; }
        entry.tile.style.visibility='visible';
        entry.tile.style.transform=`translate3d(${pose.x}px,${pose.y}px,0) scale(${pose.s})`;
        entry.tile.style.opacity=String(pose.opacity);
        const isVariant=isFeature(state)&&state.section.ids.includes(id);
        entry.tile.style.zIndex=isVariant?'3':'1';
        const variantIndex=isVariant?state.section.ids.indexOf(id):-1;
        const variantLabel=isVariant?state.section.variant_labels?.[variantIndex]:'';
        const labelParts=isVariant&&state.section.ids.length>=12?variantLabel?.split(' · '):null;
        entry.label.textContent=isVariant?(state.section.id==='timing'?(variantIndex?'fast swing':'slow swing'):(labelParts?.[0] || variantLabel || entry.task.label)):entry.task.label;
        entry.qualifier.textContent=labelParts?.length>1?labelParts.slice(1).join(' · '):isVariant&&variantLabel?(entry.task.short_label || ''):'';
        const screenW=W*pose.s*camera.zoom;
        const showLabel=pose.opacity>.3&&isVariant;
        entry.caption.style.display=showLabel?'':'none';
        entry.caption.style.bottom=!isFeature(state)&&state.gridCount===1?'186px':'42px';
        const minLabel=isVariant?(state.section.ids.length<=2?56:state.section.ids.length<=4?44:30):56;
        entry.caption.style.fontSize=`${Math.max(64,minLabel/(pose.s*camera.zoom))}px`;
        entry.tile.style.background=captured?'transparent':'';
        entry.image.style.visibility=captured?'hidden':'';
        if(entry.video)entry.video.style.visibility=captured?'hidden':'';
        this._applyMediaPadding(entry);
        const px=pose.x*camera.zoom+tx, py=pose.y*camera.zoom+ty;
        const inFrame=px+screenW>0&&px<W&&py+screenW*9/16>0&&py<H;
        if(inFrame&&pose.opacity>.3&&!state.phase.startsWith('method')&&!captured) ranked.push({entry,area:screenW*screenW*(isVariant?20:1)});
        this._impact(entry,state,isVariant,variantIndex);
      }
      ranked.sort((a,b)=>b.area-a.area);
      const active=ranked.slice(0,options.forceAllMedia?ranked.length:this.maxLiveVideos).map(x=>x.entry);
      this.activeEntries=active;
      const activeSet=new Set(active.map(e=>e.id));
      for(const entry of this.entries.values()) if(entry.video&&!activeSet.has(entry.id))entry.video.pause();
      const sync=[];
      if(captured&&options.syncMedia)sync.push(this._seekVideo(this.captureVideo,state.time));
      for(const entry of active){
        const video=this._ensureVideo(entry); if(!video)continue;
        const clock=this._mediaTime(entry,state);entry.clock=clock;
        video.playbackRate=clock.rate;video.loop=clock.loop??!clock.hold;
        if(options.syncMedia){sync.push(this._seekVideo(video,clock.time));}
        else if(video.readyState>=1&&Math.abs(video.currentTime-clock.time)>.20&&!video.seeking){try{video.currentTime=clock.time;}catch(_){}}
        if(this.playing&&!clock.hold&&!clock.waiting) video.play().catch(()=>{}); else video.pause();
      }
      this._hud(state);
      if(this.finalVideo&&state.phase==='finale'&&options.syncMedia)sync.push(this._seekVideo(this.finalVideo,Math.max(0,state.time-this.finaleStart)));
      this.phaseLabel.textContent=isFeature(state)?state.section.title||state.section.typed_axis:`${state.phase}${state.gridCount?' · '+state.gridCount+' views':''}`;
      const key=state.phase+':'+(state.sectionIndex??'');
      if(key!==this._phaseKey){this._phaseKey=key;this.config.onPhase?.(state);this.stage.dispatchEvent(new CustomEvent('run30phase',{detail:state}));}
      this.config.onTime?.(state.time,state);
      return options.syncMedia?Promise.all(sync).then(()=>{this._hud(state);return state;}):state;
    }

    _impact(entry,state,isVariant,index){
      const peaks=state.section?.peak_impacts || state.section?.impact_values || state.section?.impact_annotation?.values_newtons;
      const isTiming=isVariant&&(state.section.id==='timing'||state.section.id==='phase-timing'||peaks);
      if(!isTiming){if(entry.impact)entry.impact.box.style.display='none';return;}
      if(!entry.impact){
        const box=element('div','r30-impact',entry.tile),fill=element('div','r30-impact-fill',box),label=element('span','r30-impact-label',box),note=element('span','r30-impact-note',box);
        note.textContent='Peak Impact';entry.impact={box,fill,label,note};
      }
      const peak=Number(peaks?.[index]??(index===0?4:7.5));
      const clock=this._mediaTime(entry,state);
      const hit=clock.duration>0?this._ease((clock.raw-(clock.duration-.16))/.15):0;
      entry.impact.box.style.display='';entry.impact.fill.style.transform=`scaleY(${hit*peak/8})`;
      entry.impact.label.textContent=`~${peak} N`;
      // One common force scale; each tip reaches its own fixed peak annotation.
      // Values come from the paper, not a live force trace for these episodes.
      const peakHeight=520*peak/8;
      entry.impact.label.style.bottom=`${peakHeight-112}px`;
      entry.impact.note.style.bottom=`${peakHeight+20}px`;
    }

    _hud(state){
      const control=isFeature(state),composition=state.phase==='composition',method=state.phase.startsWith('method'),finale=state.phase==='finale',real=state.phase==='real-world';
      const dock=this._ease((state.time-this.introDockStart)/(this.introDockEnd-this.introDockStart));
      const introAlpha=control?1-this._ease((state.time-this.controlStart)/.16):method||finale||real?0:1;
      const prefW=this.introIntroducing.scrollWidth,brandW=this.introDex.scrollWidth;
      const frameworkW=this.introFramework.scrollWidth,generatingW=this.introGenerating.scrollWidth;
      const brandScale=60/parseFloat(getComputedStyle(this.introDex).fontSize);
      const generatingScale=60/parseFloat(getComputedStyle(this.introGenerating).fontSize);
      const allowsW=this.introAllows.scrollWidth,space=15;
      const bottomW=brandW*brandScale+allowsW+generatingW*generatingScale+space*2;
      const left=(W-bottomW)/2,topLine=(W-prefW-brandW-24)/2;
      const secondLine=(W-frameworkW-generatingW-14)/2;
      this.introBrand.style.transform=this.introDescription.style.transform='none';
      this.introBrand.style.opacity=this.introDescription.style.opacity='1';
      const fragment=(node,x,y,scale,opacity)=>{node.style.transform=`translate3d(${x}px,${y}px,0) scale(${scale})`;node.style.opacity=String(opacity*introAlpha);};
      // Begin opening-baseline correction: measure the actual inline baseline,
      // independently of glyph descenders and the two different font sizes.
      if(!this.introBaselines||!this.introBaselineFontsLoaded||document.fonts.status!=='loaded'){
        const baseline=node=>{
          const probe=node.querySelector('[data-baseline-probe]')||element('span','',node);
          probe.dataset.baselineProbe='true';probe.setAttribute('aria-hidden','true');
          probe.style.cssText='display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline;';
          const transform=getComputedStyle(node).transform;
          const localScale=transform==='none'?1:new DOMMatrixReadOnly(transform).a;
          const stageScale=this.logical.getBoundingClientRect().width/W;
          return (probe.getBoundingClientRect().top-node.getBoundingClientRect().top)/(localScale*stageScale);
        };
        this.introBaselines={prefix:baseline(this.introIntroducing),brand:baseline(this.introDex)};
        this.introBaselineFontsLoaded=document.fonts.status==='loaded';
      }
      const introBrandBaselineOffset=this.introBaselines.prefix-this.introBaselines.brand;
      // End opening-baseline correction.
      fragment(this.introIntroducing,mix(topLine,topLine-75,dock),mix(326,290,dock),mix(1,.9,dock),1-this._ease(dock/.68));
      fragment(this.introFramework,mix(secondLine,secondLine-60,dock),mix(429,395,dock),mix(1,.92,dock),1-this._ease(dock/.68));
      fragment(this.introDex,mix(topLine+prefW+24,left,dock),mix(326+introBrandBaselineOffset,823,dock),mix(1,brandScale,dock),1);
      fragment(this.introGenerating,mix(secondLine+frameworkW+14,left+brandW*brandScale+allowsW+2*space,dock),mix(429,823,dock),mix(1,generatingScale,dock),1);
      fragment(this.introAllows,left+brandW*brandScale+space,mix(850,823,dock),1,this._ease((dock-.35)/.65));
      const controlAlpha=control?this._ease((state.time-this.controlStart-.16)/.19):0;
      this.controlLine.style.opacity=String(controlAlpha);
      this.controlLine.style.transform=`translateY(${(1-controlAlpha)*30}px)`;
      this.controlLine.classList.toggle('r32-composition-line',composition);
      const fullPrefix=composition?(this.config.composition_prefix||'one policy learns the full sequence'):'DexLink provides control over ';
      this.controlPrefix.style.minWidth='0';
      // Reserve the complete sentence width while typing, so the start remains
      // anchored rather than recentering each newly added character.
      if(composition){
        const style=getComputedStyle(this.controlPrefix);
        const ctx=(this.textMeasure??=document.createElement('canvas').getContext('2d'));
        ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const tracking=(parseFloat(style.letterSpacing)||0)*(fullPrefix.length-1);
        this.controlPrefix.style.width=`${ctx.measureText(fullPrefix).width+tracking+4}px`;
      }else{
        this.controlPrefix.style.width='';
        const style=getComputedStyle(this.controlLine);
        const ctx=(this.textMeasure??=document.createElement('canvas').getContext('2d'));
        ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const axes=this.sections.filter(section=>section.kind!=='composition').map(section=>section.typed_axis||section.title);
        const measure=text=>ctx.measureText(text).width+(parseFloat(style.letterSpacing)||0)*(text.length-1);
        const width=Math.max(...axes.map(axis=>measure(fullPrefix+axis)))+12;
        this.controlLine.style.width=`${width}px`;
        this.controlLine.style.left=`${(W-width)/2}px`;
      }
      if(composition){this.controlLine.style.width='';this.controlLine.style.left='';}
      const firstComposition=composition&&this.sections[state.section.index-1]?.kind!=='composition';
      this.controlPrefix.dataset.typing=String(firstComposition&&state.localTime<1.61);
      if(firstComposition){
        const count=Math.ceil(fullPrefix.length*clamp((state.localTime-.16)/1.45));
        this.controlPrefix.textContent=fullPrefix.slice(0,count);
      }else if(control&&state.section.index===0){
        const axis=state.section.typed_axis||state.section.title;
        const count=Math.ceil((fullPrefix.length+axis.length)*clamp((state.localTime-.16)/1.2));
        this.controlPrefix.textContent=fullPrefix.slice(0,count);
        this.axisWord.textContent=axis.slice(0,Math.max(0,count-fullPrefix.length));
      }else{
        this.controlPrefix.textContent=fullPrefix;
        if(!composition)this.axisWord.textContent=this._typedAxis(state);
      }
      if(composition){
        const actions=state.section.semantic_actions||state.section.typed_axis.split(' · ');
        if(this.axisWord.dataset.actionSection!==state.section.id){
          this.axisWord.replaceChildren();this.actionNodes=[];
          actions.forEach((word,index)=>{
            const span=element('span','r37-action-word',this.axisWord);
            if(index){const separator=element('span','r37-action-separator',span);separator.textContent=' · ';}
            element('span','',span).textContent=word;this.actionNodes.push(span);
          });
          this.axisWord.dataset.actionSection=state.section.id;
        }
        const start=firstComposition?1.7:.4;
        this.actionNodes.forEach((node,index)=>{
          const shown=state.localTime+1e-8>=start+index*.28;
          node.style.opacity=shown?'1':'0';node.dataset.shown=String(shown);
        });
      }else delete this.axisWord.dataset.actionSection;
      // The fields retain their reserved widths; only the caret follows the ink.
      // Measuring text rather than the span avoids a detached cursor at the far
      // edge of the axis field while a new phrase is being typed.
      if(control&&!composition){
        const tail=this.axisWord.textContent?this.axisWord:this.controlPrefix;
        const range=document.createRange();range.selectNodeContents(tail);
        const textRect=tail.textContent?range.getBoundingClientRect():tail.getBoundingClientRect();
        const scale=this.logical.getBoundingClientRect().width/W;
        this.cursor.style.transform='none';
        const cursorRect=this.cursor.getBoundingClientRect();
        const end=tail.textContent?textRect.right:textRect.left;
        this.cursor.style.transform=`translateX(${(end-cursorRect.left)/scale+5}px)`;
      }
      this.cursor.style.opacity=String(control&&state.localTime<1.3?1:(Math.sin(state.time*5)>0?.5:0));
      this.footerWash.style.opacity=method||finale||real?'0':'1';
      this.credit.textContent='';this.credit.style.display='none';
      const compressed=control&&(['insertion','extraction','bimanual'].includes(state.section.id)||state.section.time_compressed===true);
      this.rate.textContent=method||finale||real||state.time<this.introDockStart||compressed?'':`${Number(state.section?.playback_rate??this.playbackRate)}×`;
      this.finalTitle.style.opacity=finale?'1':'0';
      const pop=state.titleAlpha||0;
      this.finalTitle.style.setProperty('--pop',String(pop));
      // The icon/subtitle signature grows first. The wordmark then falls from
      // outside the frame and pushes the subtitle only when it reaches it.
      const elapsed=finale?Math.max(0,state.time-this.finaleStart):0;
      const drop=cameraEase((elapsed-.95)/.85),gap=20;
      const rowHeight=this.finalText.offsetHeight;
      const wordHeight=this.finalWordmark.offsetHeight,subHeight=this.finalSubtitle.offsetHeight;
      const subRest=(rowHeight-subHeight)/2;
      const wordStart=-(H-rowHeight)/2-wordHeight-30;
      const wordEnd=(rowHeight-wordHeight-gap-subHeight)/2;
      const wordY=mix(wordStart,wordEnd,drop);
      const push=Math.max(0,wordY+wordHeight+gap-subRest);
      this.finalLockup.style.transform=`translate(-50%,-50%) scale(${mix(.5,1,pop)})`;
      this.finalWordmark.style.opacity=finale&&elapsed>=.95?'1':'0';
      this.finalWordmark.style.transform=`translateY(${wordY}px)`;
      this.finalSubtitle.style.transform=`translateY(${subRest+push}px)`;
      if(this.finalVideo){
        const alpha=finale?1:0;
        this.finalVideo.style.opacity=String(this.finalVideo.readyState>=2?alpha:0);
        if(finale&&this.playing)this.finalVideo.play().catch(()=>{});else this.finalVideo.pause();
      }
    }

    async _seekVideo(video, time){
      if(video.error)return;
      if(video.readyState<1){await new Promise(resolve=>{const done=()=>resolve();video.addEventListener('loadedmetadata',done,{once:true});video.addEventListener('error',done,{once:true});setTimeout(done,2000);});}
      if(video.readyState<1||video.error)return;
      const target=Math.min(time,Math.max(0,video.duration-1/60));
      if(Math.abs(video.currentTime-target)<.018&&video.readyState>=2&&!video.seeking)return;
      await new Promise(resolve=>{let timer;const done=()=>{clearTimeout(timer);video.removeEventListener('seeked',done);if(video.readyState>=2)video.dataset.present='true';resolve();};video.addEventListener('seeked',done,{once:true});timer=setTimeout(done,1400);try{video.currentTime=target;}catch(_){done();}});
    }

    _contentRect(task){
      if(task.content_rect)return task.content_rect;
      if(task.nominal_rect&&task.width&&task.height){const r=task.nominal_rect;return{x:r.x/task.width,y:r.y/task.height,width:r.width/task.width,height:r.height/task.height};}
      return{x:0,y:0,width:1,height:1};
    }

    _applyMediaPadding(entry){
      const rect=this._contentRect(entry.task);
      if(!(rect.width>0&&rect.height>0))throw new Error(`Invalid nominal content rectangle: ${entry.id}`);
      const width=W/rect.width,height=H/rect.height;
      for(const node of [entry.image,entry.video]){
        if(!node)continue;
        node.style.inset='auto';node.style.left=`${-rect.x*width}px`;node.style.top=`${-rect.y*height}px`;
        node.style.width=`${width}px`;node.style.height=`${height}px`;node.style.objectFit='fill';node.style.background='transparent';
      }
      entry.tile.style.background='transparent';entry.tile.style.overflow='visible';
    }

    exportOfflineFrames(fps=24,start=0,end=this.controlEnd){
      const frames=[];
      for(let n=0;n<Math.round((end-start)*fps);n++){
        const time=start+n/fps,state=this.stateAt(time),camera=state.camera;
        const tx=W/2-camera.cx*camera.zoom,ty=H/2-camera.cy*camera.zoom,items=[];
        for(const [id,pose]of state.poses){
          if(pose.opacity<.001)continue;
          const entry=this.entries.get(id),clock=this._mediaTime(entry,state);
          const width=W*pose.s*camera.zoom,height=H*pose.s*camera.zoom;
          const x=pose.x*camera.zoom+tx,y=pose.y*camera.zoom+ty;
          const variant=isFeature(state)&&state.section.ids.includes(id);
          items.push({id,x,y,width,height,opacity:pose.opacity,source_time:clock.time,
            source_src:entry.task.video||null,z:variant?3:1,content_rect:this._contentRect(entry.task)});
        }
        items.sort((a,b)=>a.z-b.z);frames.push({time,phase:state.phase,items});
      }
      return{schema:'dexlink_physical_visual_frames_v1',width:W,height:H,fps,start,end,
        duration:end-start,background:'#F5F4F1',frames};
    }

    seek(seconds,options={}){this.pause();return Promise.resolve(this._render(seconds,options));}
    play(){if(this.playing||this.destroyed)return;this.playing=true;const start=performance.now()-this.time*1000;const tick=now=>{if(!this.playing)return;const t=(now-start)/1000;this._render(Math.min(t,this.duration));if(t>=this.duration){this.pause();this.config.onEnd?.();return;}this._raf=requestAnimationFrame(tick);};this._raf=requestAnimationFrame(tick);}
    pause(){this.playing=false;if(this._raf)cancelAnimationFrame(this._raf);for(const entry of this.entries.values())entry.video?.pause();this.finalVideo?.pause();this.captureVideo?.pause();}
    setTasks(updates){for(const task of updates){const entry=this.entries.get(task.id);if(!entry)continue;const changed=task.video&&entry.task.video!==task.video;Object.assign(entry.task,task);Object.assign(this.tasks.get(task.id),task);if(task.poster)entry.image.src=task.poster;if(changed&&entry.video){entry.video.pause();entry.video.remove();entry.video=null;entry.mediaError=false;}}this._render(this.time);}
    setMediaManifest(manifest){const tasks=Array.isArray(manifest)?manifest:Array.isArray(manifest.tasks)?manifest.tasks:Object.entries(manifest.tasks||manifest).map(([id,value])=>({id,...value}));this.setTasks(tasks.map(task=>({...task,video:task.video||task.src})));}
    setEase(name){this.easeName=name==='glide'?'glide':'camera';this._render(this.time);}
    get mediaStats(){return{active:this.activeEntries?.map(e=>e.id)||[],decoded:Array.from(this.entries.values()).filter(e=>e.video?.readyState>=2).map(e=>e.id),failed:Array.from(this.entries.values()).filter(e=>e.mediaError).map(e=>e.id)};}
    destroy(){this.pause();this.destroyed=true;this.resizeObserver.disconnect();for(const entry of this.entries.values()){if(entry.video){entry.video.removeAttribute('src');entry.video.load();}}this.logical.remove();}
  }
  global.Run39Motion=Run39Motion;
  global.Run33Motion=Run39Motion;
  global.Run32Motion=Run39Motion;
  global.Run30Motion=Run39Motion;
})(window);

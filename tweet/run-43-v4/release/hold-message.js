/* Three whole phrases settle gently, driven by the deterministic story clock. */
(() => {
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  class RLHoldMessage{
    constructor(parent,config){
      this.config=config;
      const root=document.createElement('section');root.className='r42-hold-message';root.setAttribute('aria-label',config.text);root.setAttribute('aria-hidden','true');
      const wash=document.createElement('div');wash.className='r42-hold-wash';root.append(wash);
      const content=document.createElement('div');content.className='r42-hold-copy';root.append(content);
      const measure=document.createElement('canvas').getContext('2d');this.rows=[];this.pieces=[];
      for(let index=0;index<config.lines.length;index++){
        const row=document.createElement('p');row.className='r42-hold-line'+(index===2?' r42-hold-accent':'');row.setAttribute('aria-label',config.lines[index]);row.style.left=`${300+index*160}px`;row.style.top=`${320+index*90}px`;
        const ink=document.createElement('span');ink.className='r42-hold-ink';row.append(ink);content.append(row);this.rows.push(row);
      }
      parent.append(root);this.root=root;this.wash=wash;
      for(const row of this.rows){const style=getComputedStyle(row);measure.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;const text=row.getAttribute('aria-label');row.style.width=`${Math.ceil(measure.measureText(text).width+(text.length-1)*(parseFloat(style.letterSpacing)||0)+4)}px`;}
      for(const item of config.pieces){
        const row=this.rows[item.row],style=getComputedStyle(row);measure.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const piece=document.createElement('span');piece.className='r43-settling-piece';piece.style.display='inline-block';piece.style.width=`${measure.measureText(item.text).width+Math.max(0,item.text.length-1)*(parseFloat(style.letterSpacing)||0)}px`;row.querySelector('.r42-hold-ink').append(piece);this.pieces.push({...item,piece});
      }
    }
    update(local,active){
      const opacity=active?1-ease((local-this.config.fade_out_start)/this.config.fade_out_seconds):0;
      this.root.style.visibility=active?'visible':'hidden';this.root.style.opacity=String(opacity);this.root.setAttribute('aria-hidden',String(!active));this.wash.style.opacity=String(ease(local/.18));
      const pieces=this.pieces.map(item=>{
        const elapsed=local-item.start,visible=active&&elapsed>=0,p=clamp(elapsed/this.config.settle_seconds);
        // A small descent, contact, then a 1.2px settle; no letter-by-letter reveal.
        const y=p<.72?-10*(1-ease(p/.72))+1.2*ease(p/.72):1.2*(1-ease((p-.72)/.28));
        item.piece.textContent=visible?item.text:'';item.piece.style.opacity=visible?String(clamp(elapsed/.045)):'0';item.piece.style.transform=`translateY(${y}px)`;
        return{text:visible?item.text:'',visible,progress:p,offsetY:y,typing:false};
      });
      const lines=this.rows.map((row,index)=>{const items=pieces.filter((p,i)=>this.pieces[i].row===index);const text=items.map(x=>x.text).join('');return{text,count:text.length,progress:items.every(x=>x.visible)?1:0,typing:false};});
      this.state={active,local,opacity,text:lines.map(x=>x.text).join(' ').trim(),lines,pieces,sourceFrozen:active};return this.state;
    }
  }
  window.RLHoldMessage=RLHoldMessage;
})();

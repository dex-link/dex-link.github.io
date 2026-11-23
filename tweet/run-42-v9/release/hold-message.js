/* Clock-driven typewriter over a genuinely paused diversity-grid source. */
(() => {
  const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
  class RLHoldMessage{
    constructor(parent,config){
      this.config=config;
      const root=document.createElement('section');root.className='r42-hold-message';
      root.setAttribute('aria-label',config.text);root.setAttribute('aria-hidden','true');
      const wash=document.createElement('div');wash.className='r42-hold-wash';root.append(wash);
      const content=document.createElement('div');content.className='r42-hold-copy';root.append(content);
      this.rows=config.lines.map((text,index)=>{
        const row=document.createElement('p');row.className='r42-hold-line'+(index?' r42-hold-accent':'');
        row.setAttribute('aria-label',text);
        const ink=document.createElement('span');ink.className='r42-hold-ink';ink.setAttribute('aria-hidden','true');
        const caret=document.createElement('i');caret.className='r42-hold-caret';caret.setAttribute('aria-hidden','true');
        row.append(ink,caret);content.append(row);return{row,ink,caret,text,...config.typing[index]};
      });
      parent.append(root);this.root=root;
      const ctx=document.createElement('canvas').getContext('2d');
      for(const item of this.rows){const style=getComputedStyle(item.row);ctx.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const width=ctx.measureText(item.text).width+(item.text.length-1)*(parseFloat(style.letterSpacing)||0)+4;
        item.row.style.width=`${Math.ceil(width)}px`;
      }
    }
    update(local,active){
      const opacity=active?ease(local/.18)*(1-ease((local-this.config.fade_out_start)/this.config.fade_out_seconds)):0;
      this.root.style.visibility=active?'visible':'hidden';this.root.style.opacity=String(opacity);
      this.root.setAttribute('aria-hidden',String(!active));
      const lines=this.rows.map(item=>{
        const progress=clamp((local-item.start)/item.seconds);
        const count=active?Math.floor(item.text.length*progress+1e-7):0;
        item.ink.textContent=item.text.slice(0,count);
        const typing=active&&local>=item.start&&progress<1;
        item.caret.style.opacity=typing?'1':'0';
        return{text:item.ink.textContent,count,progress,typing};
      });
      this.state={active,local,opacity,text:lines.map(line=>line.text).join(' '),lines,sourceFrozen:active};
      return this.state;
    }
  }
  window.RLHoldMessage=RLHoldMessage;
})();

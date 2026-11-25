/* Quiet provenance annotation for simulation examples, clock-driven. */
(() => {
  const clamp=x=>Math.min(1,Math.max(0,x));
  const ease=x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
  class ExamplePolicyTag{
    constructor(parent,{oldLabel,rateLabel,openingSeconds=5,text}={}){
      this.oldLabel=oldLabel;this.rateLabel=rateLabel;this.openingSeconds=openingSeconds;
      if(oldLabel){oldLabel.style.display='none';oldLabel.style.transition='none';}
      const root=document.createElement('div');root.className='r42-example-tag';
      root.setAttribute('role','note');root.textContent=text;parent.append(root);
      this.root=root;this.width=root.offsetWidth;this.height=root.offsetHeight;
      this.fontSize=getComputedStyle(root).fontSize;
    }
    update(time,{sourceTime=time,opening=false,phase=''}={}){
      const show=!opening&&sourceTime>=2.55&&sourceTime<26.95;
      const opacity=show?ease((time-this.openingSeconds)/.2)*(1-ease((sourceTime-26.7)/.25)):0;
      const x=1600-34-this.width,y=25;
      this.root.style.transform=`translate3d(${x}px,${y}px,0)`;
      this.root.style.opacity=String(opacity);this.root.style.visibility=show?'visible':'hidden';
      if(this.oldLabel)this.oldLabel.style.display='none';
      if(this.rateLabel)this.rateLabel.style.top=show?`${y+this.height+12}px`:'86px';
      this.state={time,sourceTime,opening,phase,visible:show,opacity,x,y,width:this.width,height:this.height,
        fontSize:this.fontSize,fontFamily:'Roboto Mono',message:this.root.textContent};
      return this.state;
    }
  }
  window.ExamplePolicyTag=ExamplePolicyTag;
})();

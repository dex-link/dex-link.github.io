/* A dedicated, constant-source segment preserves the existing story clocks. */
(() => {
  const NativeStory=window.Run39Story;
  class HoldStory extends NativeStory{
    map(time){
      const mapped=super.map(time);
      return mapped.kind==='hold'?{...mapped,source:mapped.source_start,frozen:true}:mapped;
    }
  }
  window.Run39Story=HoldStory;
})();

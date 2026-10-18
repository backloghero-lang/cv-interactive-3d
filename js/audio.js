// Dzwieki syntetyzowane w WebAudio (bez plikow): cichy ambient lo-fi + stukanie klawiatury.
export function createAudio(){
  let ctx = null, master = null, on = false, padTimer = null, nextKey = 0;
  function init(){
    if(ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
  }
  // akordy Fmaj7 - Em7 - Dm7 - Cmaj7, miekki filtr
  const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]];
  let ci = 0;
  function hz(n){ return 440 * Math.pow(2, (n - 69) / 12); }
  function playChord(){
    if(!ctx || !on) return;
    const now = ctx.currentTime, lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 900; lp.connect(master);
    chords[ci % chords.length].forEach(function(n, k){
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = k ? "triangle" : "sine"; o.frequency.value = hz(n); o.detune.value = (k - 1.5) * 4;
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.05, now + 1.2); g.gain.linearRampToValueAtTime(0, now + 4.2);
      o.connect(g); g.connect(lp); o.start(now); o.stop(now + 4.4);
    });
    ci++;
  }
  function click(){
    if(!ctx || !on) return;
    const now = ctx.currentTime, len = 0.03;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = buf.getChannelData(0);
    for(let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    const src = ctx.createBufferSource(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 2500 + Math.random() * 1500;
    g.gain.value = 0.12; src.buffer = buf; src.connect(bp); bp.connect(g); g.connect(master); src.start(now);
  }
  return {
    get on(){ return on; },
    toggle: function(){
      init(); on = !on;
      if(ctx.state === "suspended") ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(on ? 0.9 : 0, ctx.currentTime + 0.4);
      if(on){ playChord(); padTimer = setInterval(playChord, 4000); } else clearInterval(padTimer);
      return on;
    },
    // wolane co klatke: losowe klikniecia, gdy postac pisze
    tick: function(dt, typing){
      if(!on || !typing) return;
      nextKey -= dt;
      if(nextKey <= 0){ click(); nextKey = 0.06 + Math.random() * 0.14; }
    }
  };
}

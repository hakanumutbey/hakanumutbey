/**
 * HENTW series kit: WebAudio SFX (SİBER POLİS için birebir kopyalandı).
 */
export function createAudioBus() {
  let ctx = null;
  function ensure() {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  function beep(freq, dur, type = "square", vol = 0.07) {
    try {
      const c = ensure();
      if (!c) return;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, c.currentTime);
      g.gain.setValueAtTime(vol, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + dur + 0.02);
    } catch {
      /* ignore */
    }
  }
  return {
    click: () => beep(440, 0.05, "sine", 0.05),
    ui: () => beep(520, 0.06, "sine", 0.06),
    shoot: () => beep(220, 0.07, "square", 0.045),
    hit: () => beep(110, 0.1, "sawtooth", 0.06),
    pickup: () => {
      beep(660, 0.07, "sine", 0.06);
      setTimeout(() => beep(880, 0.09, "sine", 0.06), 55);
    },
    win: () => {
      beep(523, 0.09, "sine", 0.06);
      setTimeout(() => beep(659, 0.09, "sine", 0.06), 90);
      setTimeout(() => beep(784, 0.18, "sine", 0.07), 180);
    },
    door: () => beep(180, 0.14, "triangle", 0.07),
    fail: () => beep(95, 0.18, "sawtooth", 0.05),
  };
}

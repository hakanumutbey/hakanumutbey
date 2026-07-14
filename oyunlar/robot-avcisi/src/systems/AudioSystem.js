export class AudioSystem {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.alarm = null;
    this.ambient = null;
  }

  unlock() {
    if (!window.AudioContext && !window.webkitAudioContext) return false;
    if (!this.context) this.createGraph();
    if (this.context.state === "suspended") this.context.resume().catch(() => {});
    this.startAmbient();
    return true;
  }

  createGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
    this.applySettings(this.settings);
  }

  applySettings(settings = this.settings) {
    this.settings = settings;
    if (!this.context) return;
    this.masterGain.gain.value = settings.volume;
    this.musicGain.gain.value = settings.musicVolume * 0.12;
    this.sfxGain.gain.value = settings.sfxVolume;
  }

  startAmbient() {
    if (!this.context || this.ambient) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 58;
    gain.gain.value = 0.32;
    oscillator.connect(gain);
    gain.connect(this.musicGain);
    oscillator.start();
    this.ambient = { oscillator, gain };
  }

  playShot() {
    this.playTone({ frequency: 110, endFrequency: 52, duration: 0.08, gain: 0.24, type: "square" });
  }

  playHit() {
    this.playTone({ frequency: 260, endFrequency: 150, duration: 0.07, gain: 0.16, type: "sawtooth" });
  }

  playPickup() {
    this.playTone({ frequency: 520, endFrequency: 760, duration: 0.11, gain: 0.12, type: "sine" });
  }

  playCraft() {
    this.playTone({ frequency: 180, endFrequency: 95, duration: 0.12, gain: 0.18, type: "triangle" });
  }

  playPowerDown() {
    this.playTone({ frequency: 190, endFrequency: 48, duration: 0.5, gain: 0.2, type: "sawtooth" });
  }

  playPowerUp() {
    this.playTone({ frequency: 120, endFrequency: 420, duration: 0.42, gain: 0.18, type: "triangle" });
  }

  playTone({ frequency, endFrequency = frequency, duration, gain, type }) {
    if (!this.unlock() || !this.context) return;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.sfxGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  startAlarm() {
    if (!this.unlock() || this.alarm || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = 440;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start();

    let high = false;
    const pulse = () => {
      if (!this.context) return;
      const now = this.context.currentTime;
      high = !high;
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.setValueAtTime(high ? 720 : 430, now);
      oscillator.frequency.linearRampToValueAtTime(high ? 430 : 720, now + 0.34);
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.34);
    };
    pulse();
    const interval = setInterval(pulse, 420);
    this.alarm = { oscillator, gain, interval };
  }

  stopAlarm() {
    if (!this.alarm || !this.context) return;
    clearInterval(this.alarm.interval);
    const now = this.context.currentTime;
    this.alarm.gain.gain.cancelScheduledValues(now);
    this.alarm.gain.gain.setValueAtTime(this.alarm.gain.gain.value, now);
    this.alarm.gain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
    this.alarm.oscillator.stop(now + 0.14);
    this.alarm = null;
  }

  isAlarmPlaying() {
    return Boolean(this.alarm);
  }
}

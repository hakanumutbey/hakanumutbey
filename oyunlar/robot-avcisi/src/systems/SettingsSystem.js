const SETTINGS_KEY = "robotAvcisi.settings.v1";

export const DEFAULT_SETTINGS = Object.freeze({
  volume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.85,
  voiceVolume: 0.8,
  playerVoiceVolume: 0.8,
  difficulty: "normal",
  crosshair: true,
  cameraSensitivity: 1800,
  fov: 75,
  fpsLimit: 60,
  vsync: true,
  quality: "medium",
  resolution: "auto",
  subtitles: true,
  largeText: false,
  colorBlind: false,
  reduceShake: false,
  autoVoice: false,
  microphone: false,
  pushToTalk: false,
  invertY: false,
  language: "tr",
  keybinds: {
    forward: "w",
    backward: "s",
    left: "a",
    right: "d",
    sneak: "c",
    interact: "e",
    place: "f",
    cycleHelper: "g",
    craftWeapon: "r",
    reclaimBench: "t",
    dropItem: "v",
    pushToTalkKey: "x",
    flashlight: "q"
  }
});

export class SettingsSystem {
  load() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return cloneDefaults();

    try {
      return sanitizeSettings(JSON.parse(raw));
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
      return cloneDefaults();
    }
  }

  save(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
  }
}

function cloneDefaults() {
  return {
    ...DEFAULT_SETTINGS,
    keybinds: { ...DEFAULT_SETTINGS.keybinds }
  };
}

function sanitizeSettings(value) {
  const settings = cloneDefaults();
  if (!value || typeof value !== "object") return settings;

  settings.volume = clamp01(value.volume, settings.volume);
  settings.musicVolume = clamp01(value.musicVolume, settings.musicVolume);
  settings.sfxVolume = clamp01(value.sfxVolume, settings.sfxVolume);
  settings.voiceVolume = clamp01(value.voiceVolume, settings.voiceVolume);
  settings.playerVoiceVolume = clamp01(value.playerVoiceVolume, settings.playerVoiceVolume);
  settings.difficulty = enumValue(value.difficulty, ["easy", "normal", "hard"], settings.difficulty);
  settings.crosshair = booleanValue(value.crosshair, settings.crosshair);
  settings.cameraSensitivity = clampNumber(value.cameraSensitivity, 900, 2800, settings.cameraSensitivity);
  settings.fov = clampNumber(value.fov, 55, 100, settings.fov);
  settings.fpsLimit = enumNumber(value.fpsLimit, [0, 30, 60, 120], settings.fpsLimit);
  settings.vsync = booleanValue(value.vsync, settings.vsync);
  settings.quality = enumValue(value.quality, ["low", "medium", "high", "ultra"], settings.quality);
  settings.resolution = enumValue(value.resolution, ["auto", "1280x720", "1600x900", "1920x1080"], settings.resolution);
  settings.subtitles = booleanValue(value.subtitles, settings.subtitles);
  settings.largeText = booleanValue(value.largeText, settings.largeText);
  settings.colorBlind = booleanValue(value.colorBlind, settings.colorBlind);
  settings.reduceShake = booleanValue(value.reduceShake, settings.reduceShake);
  settings.autoVoice = booleanValue(value.autoVoice, settings.autoVoice);
  settings.microphone = booleanValue(value.microphone, settings.microphone);
  settings.pushToTalk = booleanValue(value.pushToTalk, settings.pushToTalk);
  settings.invertY = booleanValue(value.invertY, settings.invertY);
  settings.language = enumValue(value.language, ["tr", "en", "el", "ar", "ko", "computer"], settings.language);

  if (value.keybinds && typeof value.keybinds === "object") {
    for (const action of Object.keys(settings.keybinds)) {
      settings.keybinds[action] = keyValue(value.keybinds[action], settings.keybinds[action]);
    }
  }

  return settings;
}

function clamp01(value, fallback) {
  return clampNumber(value, 0, 1, fallback);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function enumNumber(value, allowed, fallback) {
  const number = Number(value);
  return allowed.includes(number) ? number : fallback;
}

function booleanValue(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function keyValue(value, fallback) {
  if (typeof value !== "string" || value.trim().length === 0) return fallback;
  return value.trim().slice(0, 1).toLowerCase();
}

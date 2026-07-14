import { GAME_CONFIG } from "../config.js";

export const PARTY_WEAPON_IDS = GAME_CONFIG.weapons.map((weapon) => weapon.id);
export const PARTY_COSMETIC_IDS = GAME_CONFIG.cosmetics.items.map((item) => item.id);
export const DEFAULT_PARTY_WEAPON_ID = GAME_CONFIG.weapons.find((weapon) => weapon.starter)?.id || PARTY_WEAPON_IDS[0] || "pistol";
export const DEFAULT_PARTY_COSMETIC_ID = GAME_CONFIG.cosmetics.items.find((item) => item.unlock?.type === "starter")?.id || "none";

export function normalizePartyWeaponId(value, fallback = DEFAULT_PARTY_WEAPON_ID) {
  return PARTY_WEAPON_IDS.includes(value) ? value : fallback;
}

export function normalizePartyCosmeticId(value, fallback = DEFAULT_PARTY_COSMETIC_ID) {
  return PARTY_COSMETIC_IDS.includes(value) ? value : fallback;
}

export function normalizePartyUpgradeLevel(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(99, Math.round(number)));
}

export function partyWeaponColor(weaponId) {
  const weapon = GAME_CONFIG.weapons.find((item) => item.id === normalizePartyWeaponId(weaponId));
  return weapon?.color || [0.18, 0.2, 0.19];
}

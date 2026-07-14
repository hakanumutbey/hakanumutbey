import { GAME_CONFIG } from "../config.js";

export const PARTY_ROOM_MAX = GAME_CONFIG.partyState.maxRoom;
export const PARTY_Y_MAX = GAME_CONFIG.partyState.maxY;

export function normalizePartyX(value, fallback = 0) {
  return round2(boundedNumber(value, GAME_CONFIG.world.minX, GAME_CONFIG.world.maxX, fallback));
}

export function normalizePartyY(value, fallback = GAME_CONFIG.player.height) {
  return round2(boundedNumber(value, 0, PARTY_Y_MAX, fallback));
}

export function normalizePartyZ(value, fallback = GAME_CONFIG.world.minZ) {
  return round2(boundedNumber(value, GAME_CONFIG.world.minZ, GAME_CONFIG.world.maxZ, fallback));
}

export function normalizePartyYaw(value, fallback = 0) {
  return round3(boundedNumber(value, -Math.PI, Math.PI, fallback));
}

export function normalizePartyRoom(value, fallback = 1) {
  return boundedInteger(value, 1, PARTY_ROOM_MAX, fallback);
}

export function normalizePartyHp(value, fallback = GAME_CONFIG.player.hp) {
  return boundedInteger(value, 0, GAME_CONFIG.player.hp, fallback);
}

export function normalizePartyBattery(value, fallback = GAME_CONFIG.player.batteryCapacity) {
  return boundedInteger(value, 0, GAME_CONFIG.player.batteryCapacity, fallback);
}

export function normalizePartyFlashlight(flashlightOn, battery) {
  return Boolean(flashlightOn) && normalizePartyBattery(battery, 0) > 0;
}

function boundedInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function boundedNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function round2(value) {
  return Number(value.toFixed(2));
}

function round3(value) {
  return Number(value.toFixed(3));
}

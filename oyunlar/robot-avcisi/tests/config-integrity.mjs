import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assert } from "./helpers/testServer.mjs";

async function importBrowserModule(path) {
  const source = await readFile(resolve(path), "utf8");
  return import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);
}

const { GAME_CONFIG, ROBOT_TYPES, QUESTS, ACHIEVEMENTS } = await importBrowserModule("src/config.js");
const { ROOM_DEFINITIONS, getRoomDefinition } = await importBrowserModule("src/world/RoomDefinitions.js");
const PARTY_LIMITS = JSON.parse(await readFile(resolve("shared/partyLimits.json"), "utf8"));
const PARTY_LOADOUT = JSON.parse(await readFile(resolve("shared/partyLoadout.json"), "utf8"));
const PARTY_STATE_LIMITS = JSON.parse(await readFile(resolve("shared/partyStateLimits.json"), "utf8"));

const validPropTypes = new Set(["barrel", "console", "crate", "lowWall"]);

function uniqueValues(items, label) {
  const seen = new Set();
  for (const item of items) {
    assert(!seen.has(item), `${label} should be unique: ${item}`);
    seen.add(item);
  }
}

function isNumber(value) {
  return Number.isFinite(Number(value));
}

function positiveNumber(value, label) {
  assert(isNumber(value) && Number(value) > 0, `${label} should be a positive number.`);
}

function nonNegativeNumber(value, label) {
  assert(isNumber(value) && Number(value) >= 0, `${label} should be a non-negative number.`);
}

function colorTriplet(value, label) {
  assert(Array.isArray(value) && value.length === 3, `${label} should be an RGB triplet.`);
  value.forEach((channel, index) => {
    assert(isNumber(channel) && channel >= 0 && channel <= 1, `${label}[${index}] should be between 0 and 1.`);
  });
}

function insideWorld(x, z, label) {
  assert(x >= GAME_CONFIG.world.minX && x <= GAME_CONFIG.world.maxX, `${label} x should stay inside world bounds.`);
  assert(z >= GAME_CONFIG.world.minZ && z <= GAME_CONFIG.world.maxZ, `${label} z should stay inside world bounds.`);
}

uniqueValues(Object.keys(ROBOT_TYPES), "robot type id");
for (const [typeKey, type] of Object.entries(ROBOT_TYPES)) {
  assert(type.label, `${typeKey} should have a label.`);
  positiveNumber(type.hp, `${typeKey}.hp`);
  positiveNumber(type.speed, `${typeKey}.speed`);
  positiveNumber(type.damage, `${typeKey}.damage`);
  positiveNumber(type.scrap, `${typeKey}.scrap`);
  positiveNumber(type.parts, `${typeKey}.parts`);
  positiveNumber(type.size, `${typeKey}.size`);
  colorTriplet(type.color, `${typeKey}.color`);
}
assert(ROBOT_TYPES.drone.flying === true, "drone should be marked as flying.");
assert(ROBOT_TYPES.boss.hp > ROBOT_TYPES.normal.hp, "boss should have more hp than a normal robot.");
assert(ROBOT_TYPES.boss.damage > ROBOT_TYPES.normal.damage, "boss should hit harder than a normal robot.");

assert(Array.isArray(ROOM_DEFINITIONS) && ROOM_DEFINITIONS.length >= 4, "room definitions should include reusable layouts.");
uniqueValues(ROOM_DEFINITIONS.map((room) => room.id), "room id");
uniqueValues(ROOM_DEFINITIONS.map((room) => room.name), "room name");

for (const room of ROOM_DEFINITIONS) {
  assert(room.id && room.name, "each room should have id and name.");
  colorTriplet(room.floorColor, `${room.id}.floorColor`);
  colorTriplet(room.wallColor, `${room.id}.wallColor`);
  colorTriplet(room.lightColor, `${room.id}.lightColor`);
  positiveNumber(room.lightIntensity, `${room.id}.lightIntensity`);
  positiveNumber(room.ambientIntensity, `${room.id}.ambientIntensity`);
  positiveNumber(room.robotCountBase, `${room.id}.robotCountBase`);
  assert(Array.isArray(room.robotPlan) && room.robotPlan.length > 0, `${room.id} should have a robot plan.`);
  for (const robotKey of room.robotPlan) {
    assert(ROBOT_TYPES[robotKey], `${room.id} uses unknown robot type: ${robotKey}`);
  }

  assert(Array.isArray(room.spawnZones) && room.spawnZones.length > 0, `${room.id} should have spawn zones.`);
  for (const [index, zone] of room.spawnZones.entries()) {
    assert(zone.minX <= zone.maxX, `${room.id}.spawnZones[${index}] x min/max should be ordered.`);
    assert(zone.minZ <= zone.maxZ, `${room.id}.spawnZones[${index}] z min/max should be ordered.`);
    insideWorld(zone.minX, zone.minZ, `${room.id}.spawnZones[${index}].min`);
    insideWorld(zone.maxX, zone.maxZ, `${room.id}.spawnZones[${index}].max`);
  }

  for (const [index, battery] of (room.batteries || []).entries()) {
    assert(Array.isArray(battery) && battery.length === 3, `${room.id}.batteries[${index}] should be [x, y, z].`);
    insideWorld(battery[0], battery[2], `${room.id}.batteries[${index}]`);
    nonNegativeNumber(battery[1], `${room.id}.batteries[${index}].y`);
  }

  for (const [index, prop] of (room.props || []).entries()) {
    assert(validPropTypes.has(prop.type), `${room.id}.props[${index}] has unknown type: ${prop.type}`);
    insideWorld(prop.x, prop.z, `${room.id}.props[${index}]`);
    if (prop.type !== "barrel") {
      positiveNumber(prop.w, `${room.id}.props[${index}].w`);
      positiveNumber(prop.d, `${room.id}.props[${index}].d`);
    }
  }
}

assert(getRoomDefinition(1).id === ROOM_DEFINITIONS[0].id, "room 1 should use the first room definition.");
assert(getRoomDefinition(ROOM_DEFINITIONS.length + 1).id === ROOM_DEFINITIONS[0].id, "room definitions should cycle.");

uniqueValues(GAME_CONFIG.weapons.map((weapon) => weapon.id), "weapon id");
uniqueValues(GAME_CONFIG.weapons.map((weapon) => weapon.slot), "weapon slot");
const starterWeapon = GAME_CONFIG.weapons.find((weapon) => weapon.starter);
assert(starterWeapon, "at least one starter weapon is required.");
assert(JSON.stringify(PARTY_LOADOUT.weapons) === JSON.stringify(GAME_CONFIG.weapons.map((weapon) => weapon.id)), "shared party weapon ids should match game weapons.");
assert(PARTY_LOADOUT.weapons[0] === starterWeapon.id, "shared party weapon default should be the starter weapon.");
for (const weapon of GAME_CONFIG.weapons) {
  positiveNumber(weapon.damage, `${weapon.id}.damage`);
  positiveNumber(weapon.fireCooldownMs, `${weapon.id}.fireCooldownMs`);
  positiveNumber(weapon.range, `${weapon.id}.range`);
  colorTriplet(weapon.color, `${weapon.id}.color`);
  if (weapon.recipe) {
    nonNegativeNumber(weapon.recipe.scrap, `${weapon.id}.recipe.scrap`);
    nonNegativeNumber(weapon.recipe.parts, `${weapon.id}.recipe.parts`);
  }
}

positiveNumber(GAME_CONFIG.crafting.scrapPerUpgrade, "crafting.scrapPerUpgrade");
positiveNumber(GAME_CONFIG.crafting.damagePerUpgrade, "crafting.damagePerUpgrade");
positiveNumber(GAME_CONFIG.crafting.partsPerHelperRobot, "crafting.partsPerHelperRobot");
assert(PARTY_LIMITS.maxPlayersPerParty === 5, "party maxPlayersPerParty should stay at 5.");
assert(PARTY_LIMITS.maxParties === 3, "party maxParties should stay at 3.");
assert(GAME_CONFIG.party.maxPlayers === PARTY_LIMITS.maxPlayersPerParty, "game party maxPlayers should match server limits.");
assert(GAME_CONFIG.party.maxParties === PARTY_LIMITS.maxParties, "game party maxParties should match server limits.");
assert(GAME_CONFIG.alarm.explosionsTriggerAlarm === true, "explosions should trigger alarm by default.");
assert(GAME_CONFIG.development.testCommandsEnabled === false, "god mode test commands should stay disabled.");

positiveNumber(GAME_CONFIG.security.detectionRate, "security.detectionRate");
positiveNumber(GAME_CONFIG.security.sneakingDetectionRate, "security.sneakingDetectionRate");
positiveNumber(GAME_CONFIG.security.detectionCooldownRate, "security.detectionCooldownRate");
positiveNumber(GAME_CONFIG.security.cameraPromptRadius, "security.cameraPromptRadius");
assert(GAME_CONFIG.security.sneakingDetectionRate < GAME_CONFIG.security.detectionRate, "sneaking should slow camera detection.");
assert(GAME_CONFIG.security.sneakingRangeMultiplier > 0 && GAME_CONFIG.security.sneakingRangeMultiplier < 1, "sneaking range multiplier should reduce camera range.");
assert(GAME_CONFIG.security.sneakingFovMultiplier > 0 && GAME_CONFIG.security.sneakingFovMultiplier < 1, "sneaking FOV multiplier should reduce camera FOV.");

uniqueValues(GAME_CONFIG.cosmetics.items.map((item) => item.id), "cosmetic id");
const starterCosmetic = GAME_CONFIG.cosmetics.items.find((item) => item.unlock?.type === "starter");
assert(starterCosmetic, "a starter cosmetic is required.");
assert(JSON.stringify(PARTY_LOADOUT.cosmetics) === JSON.stringify(GAME_CONFIG.cosmetics.items.map((item) => item.id)), "shared party cosmetic ids should match game cosmetics.");
assert(PARTY_LOADOUT.cosmetics[0] === starterCosmetic.id, "shared party cosmetic default should be the starter cosmetic.");
for (const item of GAME_CONFIG.cosmetics.items) {
  assert(item.label && item.kind, `${item.id} should have label and kind.`);
  if (item.color) colorTriplet(item.color, `${item.id}.color`);
  if (item.unlock?.type === "kills") nonNegativeNumber(item.unlock.value, `${item.id}.unlock.value`);
}

assert(PARTY_STATE_LIMITS.position.minX === GAME_CONFIG.world.minX, "party state minX should match world minX.");
assert(PARTY_STATE_LIMITS.position.maxX === GAME_CONFIG.world.maxX, "party state maxX should match world maxX.");
assert(PARTY_STATE_LIMITS.position.minZ === GAME_CONFIG.world.minZ, "party state minZ should match world minZ.");
assert(PARTY_STATE_LIMITS.position.maxZ === GAME_CONFIG.world.maxZ, "party state maxZ should match world maxZ.");
assert(PARTY_STATE_LIMITS.position.defaultY === GAME_CONFIG.player.height, "party state defaultY should match player height.");
assert(PARTY_STATE_LIMITS.position.maxY === GAME_CONFIG.partyState.maxY, "shared party maxY should match game partyState maxY.");
assert(PARTY_STATE_LIMITS.room.max === GAME_CONFIG.partyState.maxRoom, "shared party max room should match game partyState maxRoom.");
assert(PARTY_STATE_LIMITS.hp.max === GAME_CONFIG.player.hp, "party state hp max should match player hp.");
assert(PARTY_STATE_LIMITS.battery.max === GAME_CONFIG.player.batteryCapacity, "party state battery max should match player battery capacity.");
assert(PARTY_STATE_LIMITS.upgradeLevel.max === 99, "party state upgrade level should remain capped.");

for (const [helperKey, helper] of Object.entries(GAME_CONFIG.helperRobots)) {
  assert(helper.label, `${helperKey} should have a label.`);
  positiveNumber(helper.speed, `${helperKey}.speed`);
  positiveNumber(helper.range, `${helperKey}.range`);
  if (helper.damage !== undefined) positiveNumber(helper.damage, `${helperKey}.damage`);
  colorTriplet(helper.color, `${helperKey}.color`);
}

uniqueValues(Object.values(QUESTS).map((quest) => quest.id), "quest id");
for (const quest of Object.values(QUESTS)) {
  assert(quest.label, `${quest.id} should have a label.`);
  positiveNumber(quest.target, `${quest.id}.target`);
}

uniqueValues(ACHIEVEMENTS.map((achievement) => achievement.id), "achievement id");
for (const achievement of ACHIEVEMENTS) {
  assert(achievement.label, `${achievement.id} should have a label.`);
  positiveNumber(achievement.target, `${achievement.id}.target`);
}

console.log("ok - config data supports future rooms, robots, party limits, and unlocks");

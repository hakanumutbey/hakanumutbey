import { withBrowserGame } from "./helpers/browserGame.mjs";
import { assert } from "./helpers/testServer.mjs";

const PORT = Number(process.env.TEST_PORT || 3137);

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}

check("room door opens after all room robots are destroyed", async (page) => {
  const result = await page.evaluate(async () => {
    const game = window.robotAvcisi;
    localStorage.removeItem("robotAvcisi.save.v1");
    game.resetNewGame();
    await new Promise((resolve) => setTimeout(resolve, 80));
    for (const id of [...game.robotManager.robots.keys()]) {
      const robot = game.robotManager.robots.get(id);
      if (robot?.source !== "alarm") game.robotManager.damageRobot(id, 99999, "govde");
    }
    game.ensureRoomCleared({ save: true });
    return {
      roomCleared: game.roomCleared,
      remaining: game.robotManager.countRoomRobots(),
      doorY: game.factory.exitDoor.position.y,
      doorMaterial: game.factory.exitDoor.material?.name
    };
  });

  assert(result.roomCleared, "Room should be marked clear.");
  assert(result.remaining === 0, `Expected no room robots, got ${result.remaining}.`);
  assert(result.doorY > 2, `Door should be raised, got y=${result.doorY}.`);
  assert(result.doorMaterial === "doorOpenMat", `Door material should be open, got ${result.doorMaterial}.`);
});

check("stale robots outside the playable room cannot keep the exit locked", async (page) => {
  const result = await page.evaluate(async () => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const [keptId] = [...game.robotManager.robots.keys()];
    for (const id of [...game.robotManager.robots.keys()]) {
      if (id !== keptId) game.robotManager.damageRobot(id, 99999, "govde");
    }
    const staleRobot = game.robotManager.robots.get(keptId);
    staleRobot.body.position.z = 8.4;
    game.ensureRoomCleared({ save: true });
    return {
      roomCleared: game.roomCleared,
      remaining: game.robotManager.countRoomRobots(),
      total: game.robotManager.count(),
      doorY: game.factory.exitDoor.position.y
    };
  });

  assert(result.roomCleared, "Out-of-bounds stale robot should not keep room locked.");
  assert(result.remaining === 0, `Expected no active room robots, got ${result.remaining}.`);
  assert(result.total === 0, `Expected stale robot to be pruned, got total=${result.total}.`);
  assert(result.doorY > 2, `Door should open after stale robot prune, got y=${result.doorY}.`);
});

check("robots squeezed behind the exit line cannot keep the door locked", async (page) => {
  const result = await page.evaluate(async () => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const [keptId] = [...game.robotManager.robots.keys()];
    for (const id of [...game.robotManager.robots.keys()]) {
      if (id !== keptId) game.robotManager.damageRobot(id, 99999, "govde");
    }
    const trappedRobot = game.robotManager.robots.get(keptId);
    trappedRobot.body.position.z = 7.96;
    game.tryNextRoom();
    return {
      room: game.room,
      roomCleared: game.roomCleared,
      remaining: game.robotManager.countRoomRobots(),
      total: game.robotManager.count(),
      doorY: game.factory.exitDoor.position.y
    };
  });

  assert(result.room === 2, `Door should advance to room 2, got room=${result.room}.`);
  assert(!result.roomCleared, "New room should start locked after advancing.");
  assert(result.remaining > 0, "New room should spawn fresh robots after advancing.");
  assert(result.total === result.remaining, `Only fresh room robots should remain, got total=${result.total}, remaining=${result.remaining}.`);
  assert(result.doorY < 2, `New room door should be locked after advancing, got y=${result.doorY}.`);
});

check("last visible room robots are recalled near the player when the door is tried", async (page) => {
  const result = await page.evaluate(async () => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const [keptId] = [...game.robotManager.robots.keys()];
    for (const id of [...game.robotManager.robots.keys()]) {
      if (id !== keptId) game.robotManager.damageRobot(id, 99999, "govde");
    }
    const robot = game.robotManager.robots.get(keptId);
    robot.body.position.set(-8.8, robot.body.position.y, 7.6);
    game.player.camera.position.set(0, 1.7, 7.3);
    game.tryNextRoom();
    const recalled = game.robotManager.robots.get(keptId);
    return {
      roomCleared: game.roomCleared,
      remaining: game.robotManager.countRoomRobots(),
      x: recalled.body.position.x,
      z: recalled.body.position.z
    };
  });

  assert(!result.roomCleared, "A still-alive robot should keep the room locked.");
  assert(result.remaining === 1, `Expected one remaining robot, got ${result.remaining}.`);
  assert(result.z < 7.2, `Recalled robot should move away from the exit wall, got z=${result.z}.`);
  assert(result.x > -7.5, `Recalled robot should move into visible room space, got x=${result.x}.`);
});

check("backpack pickups only collect what fits and leave the rest", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.factory.clearPickups();
    game.inventory.scrap = game.inventory.capacity - 1;
    game.inventory.robotParts = 0;
    game.inventory.batteryPacks = 0;
    const pickup = game.factory.createScrapPickup(game.player.position.clone(), 3);
    const collected = game.factory.collectNearbyScrap(game.player.position, game.inventory);
    return {
      collected,
      scrap: game.inventory.scrap,
      pickupAlive: !pickup.isDisposed(),
      pickupValue: pickup.metadata.value
    };
  });

  assert(result.collected === 1, `Expected to collect one scrap, got ${result.collected}.`);
  assert(result.scrap === 20, `Expected full backpack scrap count 20, got ${result.scrap}.`);
  assert(result.pickupAlive, "Overflow pickup should remain in the world.");
  assert(result.pickupValue === 2, `Expected two scrap left in pickup, got ${result.pickupValue}.`);
});

check("flashlight loads a spare battery instead of staying dead", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.inventory.battery = 0;
    game.inventory.batteryPacks = 1;
    game.flashlight.enabled = false;
    game.flashlight.toggle();
    return {
      enabled: game.flashlight.enabled,
      battery: game.inventory.battery,
      batteryPacks: game.inventory.batteryPacks,
      intensity: game.factory.flashlight.intensity
    };
  });

  assert(result.enabled, "Flashlight should turn on after loading a spare battery.");
  assert(result.battery > 0, `Expected battery charge after reload, got ${result.battery}.`);
  assert(result.batteryPacks === 0, `Expected spare battery to be consumed, got ${result.batteryPacks}.`);
  assert(result.intensity > 0, `Expected visible flashlight intensity, got ${result.intensity}.`);
});

check("party computer opens only through the in-world computer interaction", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.hud.closeComputer();
    game.player.camera.position.set(0, 1.7, -8);
    const farTarget = game.interactionTarget();
    game.handleInteract();
    const openFar = game.hud.isComputerOpen();

    game.player.camera.position.copyFrom(game.factory.computerPosition);
    const nearTarget = game.interactionTarget();
    game.handleInteract();
    const openNear = game.hud.isComputerOpen();
    const computerPanelVisible = !document.querySelector("#computerPanel").classList.contains("hidden");
    return {
      farTarget,
      openFar,
      nearTarget,
      openNear,
      computerPanelVisible,
      hasCreateButton: Boolean(document.querySelector("#createPartyBtn")),
      hasJoinButton: Boolean(document.querySelector("#joinPartyBtn")),
      hasVoiceIcon: Boolean(document.querySelector("#voiceBtn .voice-icon")),
      menuHasPartyButtons: Boolean(document.querySelector("#mainMenu #createPartyBtn, #mainMenu #joinPartyBtn"))
    };
  });

  assert(result.farTarget !== "computer", `Expected no computer target while far away, got ${result.farTarget}.`);
  assert(!result.openFar, "Computer panel should stay closed when interacting away from the computer.");
  assert(result.nearTarget === "computer", `Expected computer target near the terminal, got ${result.nearTarget}.`);
  assert(result.openNear && result.computerPanelVisible, "Computer panel should open from the in-world computer.");
  assert(result.hasCreateButton && result.hasJoinButton, "Computer panel should contain create and join party controls.");
  assert(result.hasVoiceIcon, "Voice button should include the two-head voice icon element.");
  assert(!result.menuHasPartyButtons, "Party controls should not live in the main menu.");
});

check("party client normalizes outgoing state from game config limits", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.player.camera.position.set(999, 9, -999);
    game.player.hp = -12;
    game.room = 5000;
    game.inventory.battery = 140;
    game.flashlight.enabled = true;
    const highState = game.party.currentPlayerState();

    game.inventory.battery = -5;
    const noBatteryEquipment = game.party.currentEquipment();
    return { highState, noBatteryEquipment };
  });

  assert(result.highState.x === 9.8, `Party state x should clamp to world maxX, got ${result.highState.x}.`);
  assert(result.highState.y === 3.2, `Party state y should clamp to party maxY, got ${result.highState.y}.`);
  assert(result.highState.z === -7.8, `Party state z should clamp to world minZ, got ${result.highState.z}.`);
  assert(result.highState.room === 999, `Party room should clamp to 999, got ${result.highState.room}.`);
  assert(result.highState.hp === 0, `Party hp should clamp to 0, got ${result.highState.hp}.`);
  assert(result.highState.battery === 100, `Party battery should clamp to 100, got ${result.highState.battery}.`);
  assert(result.highState.flashlightOn, "Flashlight should stay on when clamped battery is positive.");
  assert(result.noBatteryEquipment.battery === 0, `Negative battery should clamp to 0, got ${result.noBatteryEquipment.battery}.`);
  assert(!result.noBatteryEquipment.flashlightOn, "Flashlight should turn off in party state when battery is empty.");
});

check("party client handles invalid and unknown server messages without crashing", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.hud.logLines = [];
    game.party.disconnectStatus = "";
    game.party.handleMessage("{bad json");
    const afterInvalid = {
      status: game.party.ui.status.textContent,
      logs: [...game.hud.logLines]
    };
    game.party.handleMessage(JSON.stringify({ type: "strange-server-message" }));
    return {
      afterInvalid,
      status: game.party.ui.status.textContent,
      logs: [...game.hud.logLines],
      code: game.party.code,
      hasWebSocket: Boolean(game.party.ws)
    };
  });

  assert(result.afterInvalid.status.includes("Mesaj bozuk"), `Invalid message should show a clear status, got ${result.afterInvalid.status}.`);
  assert(result.afterInvalid.logs.some((line) => line.includes("Mesaj bozuk")), `Invalid message should be logged, got ${JSON.stringify(result.afterInvalid.logs)}.`);
  assert(result.status.includes("Parti hatasi"), `Unknown message should show a party error, got ${result.status}.`);
  assert(result.logs.some((line) => line.includes("Parti hatasi")), `Unknown message should be logged, got ${JSON.stringify(result.logs)}.`);
  assert(result.code === "" && !result.hasWebSocket, "Invalid party messages should not create a party connection.");
});

check("party avatars normalize incoming remote state before rendering", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.room = 999;
    game.party.otherPlayers.set("wild", {
      id: "wild",
      name: "Wild",
      x: 999,
      y: 999,
      z: -999,
      yaw: 99,
      room: 5000,
      hp: 150,
      cosmeticId: "badCosmetic",
      weaponId: "badWeapon",
      upgradeLevel: 123,
      flashlightOn: true,
      battery: 999
    });
    const played = game.partyAvatars.playRemoteCommand("wild", "/dans");
    const avatar = game.partyAvatars.avatars.get("wild");
    return {
      played,
      x: Number(avatar?.root.position.x.toFixed(2)),
      y: Number(avatar?.root.position.y.toFixed(2)),
      z: Number(avatar?.root.position.z.toFixed(2)),
      yaw: Number(avatar?.root.rotation.y.toFixed(3)),
      weaponId: avatar?.weaponId,
      cosmeticId: avatar?.cosmeticId,
      weaponUpgradeLevel: avatar?.weaponUpgradeLevel,
      battery: avatar?.battery,
      flashlightOn: avatar?.flashlightOn
    };
  });

  assert(result.played, "Remote command should create an avatar when normalized room matches.");
  assert(result.x === 9.8, `Remote avatar x should clamp to maxX, got ${result.x}.`);
  assert(result.y === 2.35, `Remote avatar y should clamp to maxY minus avatar offset, got ${result.y}.`);
  assert(result.z === -7.8, `Remote avatar z should clamp to minZ, got ${result.z}.`);
  assert(result.yaw === 3.142, `Remote avatar yaw should clamp to PI, got ${result.yaw}.`);
  assert(result.weaponId === "pistol", `Bad remote weapon should fall back to pistol, got ${result.weaponId}.`);
  assert(result.cosmeticId === "none", `Bad remote cosmetic should fall back to none, got ${result.cosmeticId}.`);
  assert(result.weaponUpgradeLevel === 99, `Remote upgrade should clamp to 99, got ${result.weaponUpgradeLevel}.`);
  assert(result.battery === 100 && result.flashlightOn, `Remote battery/flashlight should clamp to on at 100, got ${JSON.stringify(result)}.`);
});

check("first-person camera and settings controls apply to the real player view", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    const initial = {
      activeCamera: game.scene.activeCamera?.name,
      y: game.player.camera.position.y,
      speed: game.player.camera.speed,
      minZ: game.player.camera.minZ,
      ellipsoidY: game.player.camera.ellipsoid.y,
      collisions: game.player.camera.checkCollisions
    };
    game.menu.setCameraSensitivity(1300);
    game.menu.setFov(90);
    game.menu.toggleCrosshair(false);
    game.menu.setQuality("ultra");
    game.menu.setAccessibility("largeText", true);
    game.menu.setAccessibility("colorBlind", true);
    game.menu.setAccessibility("reduceShake", true);
    game.input.keys.add("c");
    game.player.update(game.input);
    const sneaking = {
      y: game.player.camera.position.y,
      speed: game.player.camera.speed,
      isSneaking: game.player.isSneaking
    };
    game.input.keys.delete("c");
    game.player.update(game.input);
    return {
      initial,
      sensitivity: {
        setting: game.settings.cameraSensitivity,
        camera: game.player.camera.angularSensibility,
        mouse: game.player.camera.inputs?.attached?.mouse?.angularSensibility
      },
      fov: {
        setting: game.settings.fov,
        radians: Number(game.player.camera.fov.toFixed(4))
      },
      crosshairHidden: document.querySelector(".crosshair").classList.contains("hidden"),
      quality: {
        setting: game.settings.quality,
        scaling: game.engine.getHardwareScalingLevel()
      },
      bodyClasses: {
        largeText: document.body.classList.contains("large-text"),
        colorBlind: document.body.classList.contains("color-blind"),
        reduceShake: document.body.classList.contains("reduce-shake")
      },
      sneaking,
      standingY: game.player.camera.position.y
    };
  });

  assert(result.initial.activeCamera === "playerCamera", `Expected player camera active, got ${result.initial.activeCamera}.`);
  assert(result.initial.y === 1.7, `Expected first-person eye height 1.7, got ${result.initial.y}.`);
  assert(result.initial.minZ <= 0.1, `Expected close first-person near plane, got ${result.initial.minZ}.`);
  assert(result.initial.ellipsoidY === 0.85 && result.initial.collisions, "Player camera should use collisions for first-person movement.");
  assert(result.sensitivity.setting === 1300 && result.sensitivity.camera === 1300, `Sensitivity did not apply: ${JSON.stringify(result.sensitivity)}.`);
  assert(result.sensitivity.mouse === 1300, `Mouse sensitivity did not apply: ${JSON.stringify(result.sensitivity)}.`);
  assert(result.fov.setting === 90 && Math.abs(result.fov.radians - 1.5708) < 0.001, `FOV did not apply: ${JSON.stringify(result.fov)}.`);
  assert(result.crosshairHidden, "Crosshair toggle should hide the crosshair.");
  assert(result.quality.setting === "ultra" && result.quality.scaling === 0.7, `Ultra quality scaling did not apply: ${JSON.stringify(result.quality)}.`);
  assert(result.bodyClasses.largeText && result.bodyClasses.colorBlind && result.bodyClasses.reduceShake, `Accessibility classes missing: ${JSON.stringify(result.bodyClasses)}.`);
  assert(result.sneaking.isSneaking && result.sneaking.y === 1.15, `Sneak should lower camera to 1.15, got ${JSON.stringify(result.sneaking)}.`);
  assert(result.standingY === 1.7, `Standing should restore camera height to 1.7, got ${result.standingY}.`);
});

check("room definitions drive robot variety and reusable room layouts", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    const roomIds = [1, 2, 3, 4, 5].map((room) => game.factory.getRoomDefinitionId(room));
    const plans = [1, 2, 3, 4].map((room) => ({
      room,
      id: game.factory.getRoomDefinitionId(room),
      name: game.factory.getRoomName(room),
      plan: game.factory.getRoomRobotPlan(room).robotPlan,
      zones: game.factory.getRoomRobotPlan(room).spawnZones.length
    }));
    const plannedTypes = [...new Set(plans.flatMap((plan) => plan.plan))].sort();

    game.factory.applyRoomLayout(1);
    const lab = {
      id: game.factory.currentRoomDefinition.id,
      props: game.factory.dynamicProps.length,
      batteries: game.factory.batteries.length,
      floor: game.factory.floor.material.diffuseColor.asArray().map((value) => Number(value.toFixed(2)))
    };
    game.factory.applyRoomLayout(4);
    const bossRoom = {
      id: game.factory.currentRoomDefinition.id,
      props: game.factory.dynamicProps.length,
      batteries: game.factory.batteries.length,
      floor: game.factory.floor.material.diffuseColor.asArray().map((value) => Number(value.toFixed(2)))
    };

    game.robotManager.clear();
    game.robotManager.spawnWave(4, game.difficultyProfile());
    const spawnedTypes = [...new Set([...game.robotManager.robots.values()].map((robot) => robot.typeKey))].sort();
    const boss = [...game.robotManager.robots.values()].find((robot) => robot.typeKey === "boss");
    const drone = [...game.robotManager.robots.values()].find((robot) => robot.typeKey === "drone");
    return {
      roomIds,
      plans,
      plannedTypes,
      lab,
      bossRoom,
      spawnedTypes,
      boss: boss ? { hp: boss.hp, damage: boss.damage, scrap: boss.scrap, scaleY: Number(boss.body.scaling.y.toFixed(2)) } : null,
      drone: drone ? { flying: drone.flying, y: Number(drone.body.position.y.toFixed(2)) } : null,
      robotCount: game.robotManager.countRoomRobots()
    };
  });

  assert(result.roomIds[0] === "lab" && result.roomIds[4] === "lab", `Room definitions should cycle back to lab on room 5, got ${JSON.stringify(result.roomIds)}.`);
  assert(result.plans.length === 4 && result.plans.every((plan) => plan.plan.length > 0 && plan.zones > 0), `Each room needs robot plan and spawn zones: ${JSON.stringify(result.plans)}.`);
  for (const type of ["boss", "drone", "fast", "normal", "shield"]) {
    assert(result.plannedTypes.includes(type), `Expected planned robot type ${type}, got ${JSON.stringify(result.plannedTypes)}.`);
    assert(result.spawnedTypes.includes(type), `Expected boss room to spawn ${type}, got ${JSON.stringify(result.spawnedTypes)}.`);
  }
  assert(result.lab.id === "lab" && result.lab.props > 0 && result.lab.batteries === 3, `Lab layout did not apply correctly: ${JSON.stringify(result.lab)}.`);
  assert(result.bossRoom.id === "bossBay" && result.bossRoom.props > 0 && result.bossRoom.batteries === 2, `Boss room layout did not apply correctly: ${JSON.stringify(result.bossRoom)}.`);
  assert(result.lab.floor.join(",") !== result.bossRoom.floor.join(","), "Room floor colors should change per room definition.");
  assert(result.boss?.hp > 100 && result.boss.damage > 10 && result.boss.scrap > 5, `Boss stats should be stronger than normal robots: ${JSON.stringify(result.boss)}.`);
  assert(result.drone?.flying && result.drone.y > 1.4, `Drone should spawn as a flying robot, got ${JSON.stringify(result.drone)}.`);
  assert(result.robotCount >= 8, `Expected boss room wave to contain many robots, got ${result.robotCount}.`);
});

check("workbench crafts a weapon by placing parts and scrap one by one", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.player.camera.position.copyFrom(game.factory.benchPosition);
    const weapon = game.combat.nextLockedWeapon();
    const recipe = weapon.recipe;
    game.inventory.robotParts = recipe.parts;
    game.inventory.scrap = recipe.scrap;
    for (let index = 0; index < recipe.parts + recipe.scrap; index += 1) {
      game.crafting.tryCraftWeapon(game.player.position);
    }
    return {
      craftedWeapon: weapon.id,
      activeWeaponId: game.combat.activeWeaponId,
      unlocked: game.combat.unlockedWeaponIds.has(weapon.id),
      scrap: game.inventory.scrap,
      parts: game.inventory.robotParts,
      benchTotal: game.crafting.totalItemsOnBench(),
      hammerVisible: game.combat.isHammerVisible()
    };
  });

  assert(result.craftedWeapon === "scrapRifle", `Expected first craftable weapon scrapRifle, got ${result.craftedWeapon}.`);
  assert(result.unlocked, "Crafted weapon should be unlocked.");
  assert(result.activeWeaponId === "scrapRifle", `Crafted weapon should become active, got ${result.activeWeaponId}.`);
  assert(result.scrap === 0 && result.parts === 0, `Recipe materials should be consumed, got scrap=${result.scrap}, parts=${result.parts}.`);
  assert(result.benchTotal === 0, `Workbench should be empty after crafting, got ${result.benchTotal}.`);
  assert(result.hammerVisible, "Hammer animation should be visible during crafting.");
});

check("workbench upgrades weapon damage by placing scrap one by one", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.player.camera.position.copyFrom(game.factory.benchPosition);
    game.inventory.scrap = 20;
    const beforeDamage = game.combat.damage;
    const beforeUpgradeLevel = game.combat.upgradeLevel;
    let placed = 0;
    while (game.combat.upgradeLevel === beforeUpgradeLevel && placed < 20) {
      game.crafting.tryUpgradeWeapon(game.player.position);
      placed += 1;
    }
    return {
      beforeDamage,
      afterDamage: game.combat.damage,
      beforeUpgradeLevel,
      afterUpgradeLevel: game.combat.upgradeLevel,
      placed,
      upgradeScrapNeeded: game.crafting.upgradeScrapNeeded(),
      readyAfterUpgrade: game.crafting.isWeaponUpgradeReady(),
      scrapOnBench: game.crafting.scrapOnBench,
      inventoryScrap: game.inventory.scrap,
      hammerVisible: game.combat.isHammerVisible(),
      logs: [...game.hud.logLines]
    };
  });

  assert(result.placed === result.upgradeScrapNeeded, `Upgrade should consume one full scrap recipe, got ${JSON.stringify(result)}.`);
  assert(result.afterUpgradeLevel === result.beforeUpgradeLevel + 1, `Weapon upgrade level should increase by one, got ${JSON.stringify(result)}.`);
  assert(result.afterDamage > result.beforeDamage, `Weapon damage should increase, got ${result.beforeDamage} -> ${result.afterDamage}.`);
  assert(result.scrapOnBench === 0 && !result.readyAfterUpgrade, `Workbench upgrade scrap should reset, got ${JSON.stringify(result)}.`);
  assert(result.inventoryScrap === 20 - result.placed, `Inventory scrap should be consumed one by one, got ${result.inventoryScrap}.`);
  assert(result.hammerVisible, "Hammer animation should be visible during upgrade.");
  assert(result.logs.some((line) => line.includes("Silah guclendi")), `Upgrade should be logged, got ${JSON.stringify(result.logs)}.`);
});

check("workbench builds helper robots from placed robot parts", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.player.camera.position.copyFrom(game.factory.benchPosition);
    game.inventory.robotParts = 4;
    game.crafting.selectedHelperType = "fighter";
    for (let index = 0; index < 4; index += 1) game.crafting.tryBuildHelper(game.player.position);
    return {
      helpers: game.helperRobots.helpers.length,
      fighterHelpers: game.helperRobots.countByType("fighter"),
      parts: game.inventory.robotParts,
      benchTotal: game.crafting.totalItemsOnBench(),
      helperType: game.helperRobots.helpers[0]?.typeKey
    };
  });

  assert(result.helpers === 1, `Expected one helper robot, got ${result.helpers}.`);
  assert(result.fighterHelpers === 1, `Expected one fighter helper, got ${result.fighterHelpers}.`);
  assert(result.helperType === "fighter", `Expected fighter helper, got ${result.helperType}.`);
  assert(result.parts === 0, `Expected helper recipe to consume parts, got ${result.parts}.`);
  assert(result.benchTotal === 0, `Expected helper bench to reset, got ${result.benchTotal}.`);
});

check("workbench reclaim respects backpack capacity and leaves overflow on bench", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.player.camera.position.copyFrom(game.factory.benchPosition);
    game.inventory.scrap = game.inventory.capacity - 2;
    game.inventory.robotParts = 0;
    game.inventory.batteryPacks = 0;
    game.crafting.scrapOnBench = 2;
    game.crafting.robotPartsOnBench = 2;
    game.crafting.weaponScrapOnBench = 1;
    game.crafting.weaponPartsOnBench = 1;
    game.crafting.renderBenchItems();
    const beforeTotal = game.crafting.totalItemsOnBench();
    const reclaimed = game.crafting.reclaimBench(game.player.position);
    return {
      reclaimed,
      beforeTotal,
      scrap: game.inventory.scrap,
      parts: game.inventory.robotParts,
      freeSlots: game.inventory.freeSlots(),
      scrapOnBench: game.crafting.scrapOnBench,
      robotPartsOnBench: game.crafting.robotPartsOnBench,
      weaponScrapOnBench: game.crafting.weaponScrapOnBench,
      weaponPartsOnBench: game.crafting.weaponPartsOnBench,
      afterTotal: game.crafting.totalItemsOnBench(),
      visibleItems: game.crafting.benchItems.length,
      logs: [...game.hud.logLines]
    };
  });

  assert(result.reclaimed, "Reclaim should handle a nearby workbench.");
  assert(result.beforeTotal === 6, `Expected six items on bench before reclaim, got ${result.beforeTotal}.`);
  assert(result.scrap === 20 && result.parts === 0 && result.freeSlots === 0, `Backpack should fill with returned scrap only, got ${JSON.stringify(result)}.`);
  assert(result.scrapOnBench === 0, `Returned upgrade scrap should leave bench, got ${result.scrapOnBench}.`);
  assert(result.robotPartsOnBench === 2 && result.weaponScrapOnBench === 1 && result.weaponPartsOnBench === 1, `Overflow materials should stay on bench, got ${JSON.stringify(result)}.`);
  assert(result.afterTotal === 4 && result.visibleItems === 4, `Bench should keep and render overflow items, got ${JSON.stringify(result)}.`);
  assert(result.logs.some((line) => line.includes("geri alindi")), `Returned materials should be logged, got ${JSON.stringify(result.logs)}.`);
  assert(result.logs.some((line) => line.includes("Tezgahta") && line.includes("kaldi")), `Remaining bench materials should be logged, got ${JSON.stringify(result.logs)}.`);
});

check("health station heals, spends a charge, blocks cooldown, and recharges", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.player.hp = 30;
    const used = game.healthStation.tryUse(game.player, 1000);
    const hpAfterUse = game.player.hp;
    const chargesAfterUse = game.healthStation.charges;
    game.player.hp = 30;
    const blockedByCooldown = game.healthStation.tryUse(game.player, 1100);
    game.healthStation.update(1000 + 18000 + 1);
    return {
      used,
      hpAfterUse,
      chargesAfterUse,
      blockedByCooldown,
      chargesAfterRecharge: game.healthStation.charges
    };
  });

  assert(result.used, "Health station should heal an injured player.");
  assert(result.hpAfterUse === 75, `Expected HP 75 after heal, got ${result.hpAfterUse}.`);
  assert(result.chargesAfterUse === 2, `Expected one charge spent, got ${result.chargesAfterUse}.`);
  assert(!result.blockedByCooldown, "Health station should block immediate second use during cooldown.");
  assert(result.chargesAfterRecharge === 3, `Expected recharge back to 3, got ${result.chargesAfterRecharge}.`);
});

check("shooting robot parts detaches components and drops usable loot", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    const robot = [...game.robotManager.robots.values()].find((item) => item.typeKey === "normal");
    const scrapBefore = game.factory.scrap.length;
    const partsBefore = game.factory.robotParts.length;
    game.robotManager.damageRobot(robot.id, 1, "sol kol");
    const detached = robot.parts.find((part) => part.name === "sol kol")?.detached;
    return {
      robotStillAlive: game.robotManager.robots.has(robot.id),
      detached,
      scrapAdded: game.factory.scrap.length - scrapBefore,
      partsAdded: game.factory.robotParts.length - partsBefore,
      damagePenalty: robot.damagePenalty
    };
  });

  assert(result.robotStillAlive, "A low-damage part hit should not destroy the robot.");
  assert(result.detached, "Hit robot arm should detach.");
  assert(result.scrapAdded >= 1, `Expected detached part to drop scrap, got ${result.scrapAdded}.`);
  assert(result.partsAdded >= 1, `Expected detached part to drop robot parts, got ${result.partsAdded}.`);
  assert(result.damagePenalty < 1, `Expected arm loss to reduce damage, got ${result.damagePenalty}.`);
});

check("chat command aliases trigger local emotes and keep god mode disabled", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.hud.logLines = [];
    game.settings.reduceShake = false;
    game.handleChatCommand("/dance", "Hakan");
    const danceRoll = game.player.camera.cameraRotation.z;
    const localEffectsAfterDance = game.partyAvatars.localEffects.length;

    game.settings.reduceShake = true;
    game.player.camera.cameraRotation.z = 0;
    game.handleChatCommand("/dans", "Hakan");
    const reducedShakeRoll = game.player.camera.cameraRotation.z;

    game.party.otherPlayers.set("friend", {
      id: "friend",
      name: "Emre",
      x: game.player.position.x + 1,
      y: game.player.position.y,
      z: game.player.position.z,
      yaw: 0,
      room: game.room,
      hp: 100,
      cosmeticId: "none",
      weaponId: "pistol",
      upgradeLevel: 0,
      flashlightOn: false,
      battery: 100
    });
    const avatar = game.partyAvatars.createAvatar("friend", "Emre");
    avatar.root.position = game.player.position.add(new BABYLON.Vector3(1, -0.85, 0));
    game.player.hp = 70;
    game.handleChatCommand("/hug", "Hakan");
    const hpAfterHug = game.player.hp;
    game.handleChatCommand("/high-five", "Hakan");
    const hammerVisible = game.combat.isHammerVisible();
    game.player.hp = 20;
    game.handleChatCommand("/god", "Hakan");
    return {
      danceRoll,
      localEffectsAfterDance,
      reducedShakeRoll,
      hpAfterHug,
      hammerVisible,
      hpAfterGod: game.player.hp,
      logs: game.hud.logLines
    };
  });

  assert(result.localEffectsAfterDance > 0, "Dance command should create a local visual effect.");
  assert(result.danceRoll > 0, `Dance should add camera roll when shake is enabled, got ${result.danceRoll}.`);
  assert(result.reducedShakeRoll === 0, `Reduced shake should prevent dance camera roll, got ${result.reducedShakeRoll}.`);
  assert(result.hpAfterHug === 75, `Hug near a player should heal 5 HP, got ${result.hpAfterHug}.`);
  assert(result.hammerVisible, "High-five alias should play the hammer hand animation.");
  assert(result.hpAfterGod === 20, `God command should be disabled in normal builds, got hp=${result.hpAfterGod}.`);
  assert(result.logs.some((line) => line.includes("Test komutu kapali")), `Expected disabled test command log, got ${JSON.stringify(result.logs)}.`);
});

check("language changes update gameplay HUD and system labels beyond the main menu", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.menu.applyLanguage("en");
    game.updateHud();
    const english = {
      htmlLang: document.documentElement.lang,
      prompt: document.querySelector("#promptText").textContent,
      power: document.querySelector("#powerText").textContent,
      weapon: document.querySelector("#weaponText").textContent,
      inventory: [...document.querySelectorAll("#backpackItems .inventory-chip")].map((item) => item.textContent),
      achievement: document.querySelector("#achievementList .achievement")?.textContent || "",
      voiceButton: document.querySelector("#voiceBtn").textContent
    };
    game.menu.applyLanguage("tr");
    game.updateHud();
    const turkish = {
      htmlLang: document.documentElement.lang,
      prompt: document.querySelector("#promptText").textContent,
      power: document.querySelector("#powerText").textContent,
      weapon: document.querySelector("#weaponText").textContent,
      inventory: [...document.querySelectorAll("#backpackItems .inventory-chip")].map((item) => item.textContent),
      achievement: document.querySelector("#achievementList .achievement")?.textContent || "",
      voiceButton: document.querySelector("#voiceBtn").textContent
    };
    return { english, turkish };
  });

  assert(result.english.htmlLang === "en", `Expected HTML language en, got ${result.english.htmlLang}.`);
  assert(
    result.english.prompt.includes("mouse control") || result.english.prompt.includes("Left click"),
    `Expected English gameplay prompt, got ${result.english.prompt}.`
  );
  assert(result.english.power === "On", `Expected English power label, got ${result.english.power}.`);
  assert(result.english.weapon === "Pistol", `Expected English weapon label, got ${result.english.weapon}.`);
  assert(result.english.inventory.some((item) => item.startsWith("Scrap:")), `Expected English backpack labels, got ${JSON.stringify(result.english.inventory)}.`);
  assert(result.english.achievement.includes("Destroy 100 robots"), `Expected English achievement label, got ${result.english.achievement}.`);
  assert(result.english.voiceButton.includes("Voice"), `Expected English voice button, got ${result.english.voiceButton}.`);

  assert(result.turkish.htmlLang === "tr", `Expected HTML language tr, got ${result.turkish.htmlLang}.`);
  assert(
    result.turkish.prompt.includes("Fare kontrolu") || result.turkish.prompt.includes("Sol tik"),
    `Expected Turkish gameplay prompt, got ${result.turkish.prompt}.`
  );
  assert(result.turkish.power === "Acik", `Expected Turkish power label, got ${result.turkish.power}.`);
  assert(result.turkish.weapon === "Tabanca", `Expected Turkish weapon label, got ${result.turkish.weapon}.`);
  assert(result.turkish.inventory.some((item) => item.startsWith("Hurda:")), `Expected Turkish backpack labels, got ${JSON.stringify(result.turkish.inventory)}.`);
  assert(result.turkish.achievement.includes("100 robot yok et"), `Expected Turkish achievement label, got ${result.turkish.achievement}.`);
  assert(result.turkish.voiceButton.includes("Ses"), `Expected Turkish voice button, got ${result.turkish.voiceButton}.`);
});

check("alarm spawns reinforcements and control room shutdown clears them", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    const roomRobotsBefore = game.robotManager.countRoomRobots();
    game.triggerAlarm("test alarm");
    const alarmRobotsAfterTrigger = [...game.robotManager.robots.values()].filter((robot) => robot.source === "alarm").length;
    const activeQuestAfterTrigger = game.quest.activeId;
    const alarmVisualAfterTrigger = game.factory.alarmActive;
    const alarmSoundAfterTrigger = game.audio.isAlarmPlaying();
    game.disableSecuritySystem();
    return {
      alarmRobotsAfterTrigger,
      activeQuestAfterTrigger,
      alarmVisualAfterTrigger,
      alarmSoundAfterTrigger,
      alarmAfterShutdown: game.alarm,
      alarmRobotsAfterShutdown: [...game.robotManager.robots.values()].filter((robot) => robot.source === "alarm").length,
      roomRobotsAfterShutdown: game.robotManager.countRoomRobots(),
      securityDisabled: game.security.disabled,
      alarmVisualAfterShutdown: game.factory.alarmActive,
      alarmSoundAfterShutdown: game.audio.isAlarmPlaying(),
      roomRobotsBefore
    };
  });

  assert(result.alarmRobotsAfterTrigger >= 2, `Expected alarm reinforcements, got ${result.alarmRobotsAfterTrigger}.`);
  assert(result.activeQuestAfterTrigger === "controlRoom", `Expected control room quest after alarm, got ${result.activeQuestAfterTrigger}.`);
  assert(result.alarmVisualAfterTrigger, "Alarm lights should turn on after alarm trigger.");
  assert(result.alarmSoundAfterTrigger, "Alarm siren should start after alarm trigger.");
  assert(!result.alarmAfterShutdown, "Control room shutdown should stop the alarm.");
  assert(result.alarmRobotsAfterShutdown === 0, `Expected alarm robots to retreat, got ${result.alarmRobotsAfterShutdown}.`);
  assert(result.roomRobotsAfterShutdown === result.roomRobotsBefore, "Control room shutdown should not remove normal room robots.");
  assert(result.securityDisabled, "Control room shutdown should disable security cameras.");
  assert(!result.alarmVisualAfterShutdown, "Alarm lights should turn off after shutdown.");
  assert(!result.alarmSoundAfterShutdown, "Alarm siren should stop after shutdown.");
});

check("alarm ends when its timer expires", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.triggerAlarm("timer test");
    game.combat.shots = 99;
    const alarmRobotsAfterTrigger = [...game.robotManager.robots.values()].filter((robot) => robot.source === "alarm").length;
    game.updateAlarm(game.alarmUntil + 1);
    return {
      alarm: game.alarm,
      alarmUntil: game.alarmUntil,
      nextReinforcementAt: game.nextAlarmReinforcementAt,
      waves: game.alarmReinforcementWaves,
      shots: game.combat.shots,
      visual: game.factory.alarmActive,
      siren: game.audio.isAlarmPlaying(),
      alarmRobotsAfterTrigger,
      alarmRobotsAfterTimer: [...game.robotManager.robots.values()].filter((robot) => robot.source === "alarm").length,
      logs: [...game.hud.logLines]
    };
  });

  assert(!result.alarm, "Alarm should be inactive after its timer expires.");
  assert(result.alarmUntil === 0 && result.nextReinforcementAt === 0, `Alarm timers should reset, got ${JSON.stringify(result)}.`);
  assert(result.waves === 0, `Alarm wave counter should reset, got ${result.waves}.`);
  assert(result.shots === 0, `Shot counter should reset after alarm timeout, got ${result.shots}.`);
  assert(!result.visual, "Alarm lights should turn off after timeout.");
  assert(!result.siren, "Alarm siren should stop after timeout.");
  assert(result.alarmRobotsAfterTimer === result.alarmRobotsAfterTrigger, "Alarm timeout should not delete already spawned robots.");
  assert(result.logs.some((line) => line.includes("Alarm suresi bitti")), `Alarm timeout should be logged, got ${JSON.stringify(result.logs)}.`);
});

check("too many shots trigger the alarm system", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    let threshold = 0;
    do {
      threshold += 1;
      game.combat.shots = threshold;
    } while (!game.shouldTriggerShotAlarm() && threshold < 1000);
    game.combat.shots = threshold - 1;
    game.updateAlarm(performance.now());
    const beforeThreshold = {
      alarm: game.alarm,
      shouldTrigger: game.shouldTriggerShotAlarm()
    };
    game.combat.shots = threshold;
    game.updateAlarm(performance.now());
    return {
      beforeThreshold,
      threshold,
      alarm: game.alarm,
      shots: game.combat.shots,
      quest: game.quest.activeId,
      siren: game.audio.isAlarmPlaying(),
      alarmRobots: [...game.robotManager.robots.values()].filter((robot) => robot.source === "alarm").length,
      logs: [...game.hud.logLines]
    };
  });

  assert(!result.beforeThreshold.alarm && !result.beforeThreshold.shouldTrigger, `Alarm should wait until shot threshold, got ${JSON.stringify(result.beforeThreshold)}.`);
  assert(result.alarm, "Shot threshold should trigger alarm.");
  assert(result.shots === result.threshold, `Shot counter should stay at the triggering threshold until alarm ends, got ${result.shots}.`);
  assert(result.quest === "controlRoom", `Shot alarm should require control room, got ${result.quest}.`);
  assert(result.siren, "Shot alarm should start siren.");
  assert(result.alarmRobots >= 2, `Shot alarm should spawn reinforcements, got ${result.alarmRobots}.`);
  assert(result.logs.some((line) => line.includes("Cok fazla ates")), `Shot alarm reason should be logged, got ${JSON.stringify(result.logs)}.`);
});

check("explosive weapons trigger the alarm system", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.combat.unlockWeapon("ionBlaster", { silent: true });
    game.combat.activeWeaponId = "ionBlaster";
    const weapon = game.combat.currentWeapon();
    game.combat.explode(new BABYLON.Vector3(0, 0.5, 2), weapon, null);
    return {
      weaponId: weapon.id,
      alarm: game.alarm,
      quest: game.quest.activeId,
      siren: game.audio.isAlarmPlaying(),
      alarmRobots: [...game.robotManager.robots.values()].filter((robot) => robot.source === "alarm").length,
      logs: [...game.hud.logLines]
    };
  });

  assert(result.weaponId === "ionBlaster", `Expected ionBlaster explosion, got ${result.weaponId}.`);
  assert(result.alarm, "Explosive weapon should trigger alarm.");
  assert(result.quest === "controlRoom", `Explosion alarm should require control room, got ${result.quest}.`);
  assert(result.siren, "Explosion alarm should start siren.");
  assert(result.alarmRobots >= 2, `Explosion alarm should spawn reinforcements, got ${result.alarmRobots}.`);
  assert(result.logs.some((line) => line.includes("Patlama")), `Explosion alarm reason should be logged, got ${JSON.stringify(result.logs)}.`);
});

check("security camera detection triggers the alarm system", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.started = true;
    const camera = game.security.cameras[0];
    const origin = camera.head.getAbsolutePosition();
    const forward = game.security.forwardFromYaw(camera.head.rotation.y);
    game.player.camera.position.copyFrom(origin.add(forward.scale(camera.range * 0.3)));
    game.player.isSneaking = false;
    game.security.detection = 0.99;
    game.security.cooldown = 0;
    game.security.update(game.player, 1, true, false);
    return {
      alarm: game.alarm,
      quest: game.quest.activeId,
      siren: game.audio.isAlarmPlaying(),
      cooldown: game.security.cooldown,
      detection: game.security.detection,
      logs: [...game.hud.logLines]
    };
  });

  assert(result.alarm, "Security camera detection should trigger alarm.");
  assert(result.quest === "controlRoom", `Camera alarm should require control room, got ${result.quest}.`);
  assert(result.siren, "Camera alarm should start siren.");
  assert(result.cooldown > 0, `Camera should enter detection cooldown, got ${result.cooldown}.`);
  assert(result.detection === 0, `Detection should reset after alarm, got ${result.detection}.`);
  assert(result.logs.some((line) => line.includes("Guvenlik kamerasi")), `Camera alarm reason should be logged, got ${JSON.stringify(result.logs)}.`);
});

check("security cameras make sneaking a real stealth option", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    const camera = game.security.cameras[0];
    const origin = camera.head.getAbsolutePosition();
    const forward = game.security.forwardFromYaw(camera.head.rotation.y);
    const testPosition = origin.add(forward.scale(camera.range * 0.72));
    return {
      standingVisible: game.security.canSeePlayer(camera, testPosition, false),
      sneakingVisible: game.security.canSeePlayer(camera, testPosition, true),
      standingRate: game.security.detectionRate(false),
      sneakingRate: game.security.detectionRate(true),
      promptRadius: game.security.isNearActiveCamera(testPosition)
    };
  });

  assert(result.standingVisible, "Standing player should be visible inside normal camera range.");
  assert(!result.sneakingVisible, "Sneaking should reduce camera range enough to avoid this detection.");
  assert(result.sneakingRate < result.standingRate, `Sneaking should slow detection: ${JSON.stringify(result)}.`);
  assert(result.promptRadius, "Camera prompt radius should still detect nearby active cameras.");
});

check("electricity remains stable with outages disabled", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.power.triggerOutage();
    const afterTrigger = {
      outage: game.power.outage,
      speed: game.power.robotSpeedMultiplier(),
      label: game.power.label(),
      hemi: game.factory.hemi.intensity
    };
    game.power.outage = true;
    game.factory.setPowerOutage(true);
    game.power.update(performance.now() + 120000, true);
    const afterUpdate = {
      outage: game.power.outage,
      speed: game.power.robotSpeedMultiplier(),
      label: game.power.label(),
      hemi: game.factory.hemi.intensity
    };
    game.power.restore();
    return {
      afterTrigger,
      afterUpdate,
      afterRestore: {
        outage: game.power.outage,
        speed: game.power.robotSpeedMultiplier(),
        label: game.power.label(),
        hemi: game.factory.hemi.intensity
      },
      roomAmbient: game.factory.currentRoomDefinition.ambientIntensity
    };
  });

  for (const [name, state] of Object.entries({
    afterTrigger: result.afterTrigger,
    afterUpdate: result.afterUpdate,
    afterRestore: result.afterRestore
  })) {
    assert(!state.outage, `${name}: outage should stay false.`);
    assert(state.speed === 1, `${name}: robot speed multiplier should stay 1, got ${state.speed}.`);
    assert(state.label === "Acik", `${name}: power label should remain Acik, got ${state.label}.`);
    assert(Math.abs(state.hemi - result.roomAmbient) < 0.001, `${name}: room light should remain at ambient level.`);
  }
});

check("save and load restores gameplay progress and ignores stale outage saves", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.room = 2;
    game.roomCleared = false;
    game.factory.applyRoomLayout(game.room);
    game.factory.setExitDoorOpen(false);
    game.robotManager.clear();
    const savedRobot = game.robotManager.spawnRobot("shield", new BABYLON.Vector3(1, 0, 2), game.difficultyProfile(), "room");
    savedRobot.hp = Math.round(savedRobot.maxHp * 0.5);
    game.robotManager.updateHealthBar(savedRobot);
    game.inventory.scrap = 7;
    game.inventory.robotParts = 4;
    game.inventory.battery = 43;
    game.inventory.batteryPacks = 2;
    game.inventory.totalScrapCollected = 12;
    game.inventory.totalRobotPartsCollected = 6;
    game.player.hp = 41;
    game.player.kills = 6;
    game.player.camera.position.set(3, 1.7, -4);
    game.combat.unlockWeapon("scrapRifle", { silent: true });
    game.combat.activeWeaponId = "scrapRifle";
    game.combat.upgradeLevel = 2;
    game.helperRobots.build("miner", new BABYLON.Vector3(2, 0.55, -3), { silent: true });
    game.healthStation.charges = 1;
    game.factory.createScrapPickup(new BABYLON.Vector3(2.4, 0.25, 1.7), 2);
    game.power.outage = true;
    game.factory.setPowerOutage(true);
    game.saveSystem.save();

    game.room = 1;
    game.inventory.scrap = 0;
    game.inventory.robotParts = 0;
    game.inventory.battery = 100;
    game.inventory.batteryPacks = 0;
    game.player.hp = 100;
    game.player.kills = 0;
    game.player.camera.position.set(0, 1.7, -8);
    game.combat.reset();
    game.helperRobots.reset();
    game.healthStation.reset();
    game.robotManager.clear();
    game.factory.clearPickups();
    game.power.outage = true;
    game.factory.setPowerOutage(true);

    const loaded = game.saveSystem.load();
    const loadedRobot = [...game.robotManager.robots.values()][0];
    return {
      loaded,
      room: game.room,
      roomCleared: game.roomCleared,
      inventory: {
        scrap: game.inventory.scrap,
        robotParts: game.inventory.robotParts,
        battery: game.inventory.battery,
        batteryPacks: game.inventory.batteryPacks
      },
      player: {
        hp: game.player.hp,
        kills: game.player.kills,
        x: game.player.position.x,
        z: game.player.position.z
      },
      combat: {
        activeWeaponId: game.combat.activeWeaponId,
        upgradeLevel: game.combat.upgradeLevel,
        hasScrapRifle: game.combat.unlockedWeaponIds.has("scrapRifle")
      },
      helpers: game.helperRobots.helpers.map((helper) => helper.typeKey),
      healthCharges: game.healthStation.charges,
      robot: {
        count: game.robotManager.countRoomRobots(),
        typeKey: loadedRobot?.typeKey,
        hpRatio: loadedRobot ? Number((loadedRobot.hp / loadedRobot.maxHp).toFixed(2)) : 0
      },
      pickups: {
        scrap: game.factory.scrap.length,
        batteries: game.factory.batteries.length
      },
      powerOutage: game.power.outage,
      doorY: game.factory.exitDoor.position.y
    };
  });

  assert(result.loaded, "SaveSystem.load should return true.");
  assert(result.room === 2, `Expected room 2 after load, got ${result.room}.`);
  assert(!result.roomCleared, "Room should remain uncleared after load.");
  assert(result.inventory.scrap === 7 && result.inventory.robotParts === 4, `Inventory did not restore: ${JSON.stringify(result.inventory)}.`);
  assert(result.inventory.battery === 43 && result.inventory.batteryPacks === 2, `Battery inventory did not restore: ${JSON.stringify(result.inventory)}.`);
  assert(result.player.hp === 41 && result.player.kills === 6, `Player stats did not restore: ${JSON.stringify(result.player)}.`);
  assert(result.player.x === 3 && result.player.z === -4, `Player position did not restore: ${JSON.stringify(result.player)}.`);
  assert(result.combat.activeWeaponId === "scrapRifle" && result.combat.hasScrapRifle, `Weapon state did not restore: ${JSON.stringify(result.combat)}.`);
  assert(result.combat.upgradeLevel === 2, `Expected upgrade level 2, got ${result.combat.upgradeLevel}.`);
  assert(result.helpers.length === 1 && result.helpers[0] === "miner", `Expected one miner helper, got ${JSON.stringify(result.helpers)}.`);
  assert(result.healthCharges === 1, `Expected health station charges 1, got ${result.healthCharges}.`);
  assert(result.robot.count === 1 && result.robot.typeKey === "shield", `Expected one shield robot, got ${JSON.stringify(result.robot)}.`);
  assert(result.robot.hpRatio > 0.45 && result.robot.hpRatio < 0.55, `Expected saved robot HP ratio around 0.5, got ${result.robot.hpRatio}.`);
  assert(result.pickups.scrap >= 1 && result.pickups.batteries >= 1, `Expected pickups to restore, got ${JSON.stringify(result.pickups)}.`);
  assert(!result.powerOutage, "Loaded saves should keep electricity stable even if old save had outage=true.");
  assert(result.doorY < 2, `Door should stay locked for uncleared loaded room, got y=${result.doorY}.`);
});

check("save and load restores active alarm state", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.triggerAlarm("save alarm");
    const savedAlarmRobots = [...game.robotManager.robots.values()].filter((robot) => robot.source === "alarm").length;
    game.alarmUntil = performance.now() + 12000;
    game.nextAlarmReinforcementAt = performance.now() + 3000;
    game.alarmReinforcementWaves = 2;
    game.saveSystem.save();

    game.clearAlarmState({ resetShots: true });
    game.robotManager.clear();
    game.quest.activeId = "killRobots";
    const loaded = game.saveSystem.load();
    return {
      loaded,
      alarm: game.alarm,
      visual: game.factory.alarmActive,
      siren: game.audio.isAlarmPlaying(),
      remainingMs: game.alarmUntil - performance.now(),
      nextReinforcementMs: game.nextAlarmReinforcementAt - performance.now(),
      waves: game.alarmReinforcementWaves,
      quest: game.quest.activeId,
      savedAlarmRobots,
      loadedAlarmRobots: [...game.robotManager.robots.values()].filter((robot) => robot.source === "alarm").length
    };
  });

  assert(result.loaded, "SaveSystem.load should restore an active alarm save.");
  assert(result.alarm && result.visual && result.siren, `Alarm visual/audio state did not restore: ${JSON.stringify(result)}.`);
  assert(result.remainingMs > 8000, `Alarm remaining time should restore, got ${result.remainingMs}.`);
  assert(result.nextReinforcementMs > 1000, `Next reinforcement time should restore, got ${result.nextReinforcementMs}.`);
  assert(result.waves === 2, `Alarm wave count should restore, got ${result.waves}.`);
  assert(result.quest === "controlRoom", `Active alarm load should require control room, got ${result.quest}.`);
  assert(result.loadedAlarmRobots === result.savedAlarmRobots, `Alarm robots should restore, got ${result.loadedAlarmRobots}/${result.savedAlarmRobots}.`);
});

check("save and load restores partial workbench progress", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.player.camera.position.copyFrom(game.factory.benchPosition);
    game.inventory.scrap = 20;
    game.inventory.robotParts = 20;
    game.crafting.tryUpgradeWeapon(game.player.position);
    game.crafting.tryUpgradeWeapon(game.player.position);
    game.crafting.tryBuildHelper(game.player.position);
    game.crafting.selectedHelperType = "fighter";
    game.crafting.tryCraftWeapon(game.player.position);
    game.crafting.tryCraftWeapon(game.player.position);
    game.crafting.tryCraftWeapon(game.player.position);
    const before = {
      scrapOnBench: game.crafting.scrapOnBench,
      robotPartsOnBench: game.crafting.robotPartsOnBench,
      weaponPartsOnBench: game.crafting.weaponPartsOnBench,
      weaponScrapOnBench: game.crafting.weaponScrapOnBench,
      selectedHelperType: game.crafting.selectedHelperType,
      total: game.crafting.totalItemsOnBench(),
      status: game.crafting.benchStatusText()
    };
    game.saveSystem.save();

    game.crafting.reset();
    const afterReset = game.crafting.totalItemsOnBench();
    const loaded = game.saveSystem.load();
    return {
      loaded,
      before,
      afterReset,
      after: {
        scrapOnBench: game.crafting.scrapOnBench,
        robotPartsOnBench: game.crafting.robotPartsOnBench,
        weaponPartsOnBench: game.crafting.weaponPartsOnBench,
        weaponScrapOnBench: game.crafting.weaponScrapOnBench,
        selectedHelperType: game.crafting.selectedHelperType,
        total: game.crafting.totalItemsOnBench(),
        status: game.crafting.benchStatusText(),
        visibleItems: game.crafting.benchItems.length,
        upgradeReady: game.crafting.isWeaponUpgradeReady(),
        helperReady: game.crafting.isHelperBuildReady()
      }
    };
  });

  assert(result.loaded, "SaveSystem.load should restore partial workbench progress.");
  assert(result.afterReset === 0, `Workbench reset should clear items before load, got ${result.afterReset}.`);
  assert(result.after.scrapOnBench === result.before.scrapOnBench, `Upgrade scrap did not restore: ${JSON.stringify(result)}.`);
  assert(result.after.robotPartsOnBench === result.before.robotPartsOnBench, `Helper parts did not restore: ${JSON.stringify(result)}.`);
  assert(result.after.weaponPartsOnBench === result.before.weaponPartsOnBench, `Weapon parts did not restore: ${JSON.stringify(result)}.`);
  assert(result.after.weaponScrapOnBench === result.before.weaponScrapOnBench, `Weapon scrap did not restore: ${JSON.stringify(result)}.`);
  assert(result.after.selectedHelperType === "fighter", `Selected helper type did not restore, got ${result.after.selectedHelperType}.`);
  assert(result.after.total === result.before.total && result.after.visibleItems === result.after.total, `Visible bench items did not restore: ${JSON.stringify(result)}.`);
  assert(!result.after.upgradeReady && !result.after.helperReady, "Partial workbench progress should stay incomplete after load.");
  assert(result.after.status.includes("Hurda") && result.after.status.includes("Tufegi"), `Workbench status should describe restored progress, got ${result.after.status}.`);
});

check("quest chain advances from robot kills to generator and control room", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    for (let index = 0; index < 5; index += 1) game.quest.onRobotKilled();
    const afterKills = {
      activeId: game.quest.activeId,
      completed: [...game.quest.completed],
      killProgress: game.quest.progress.killRobots
    };
    game.player.camera.position.copyFrom(game.factory.generatorPosition);
    game.handleInteract();
    const afterGenerator = {
      activeId: game.quest.activeId,
      completed: [...game.quest.completed],
      generatorProgress: game.quest.progress.generator,
      generatorActive: game.quest.completed.has("generator")
    };
    game.player.camera.position.copyFrom(game.factory.controlRoomPosition);
    game.handleInteract();
    return {
      afterKills,
      afterGenerator,
      afterControl: {
        activeId: game.quest.activeId,
        completed: [...game.quest.completed],
        controlProgress: game.quest.progress.controlRoom,
        controlCaptured: game.quest.completed.has("controlRoom"),
        securityDisabled: game.security.disabled
      }
    };
  });

  assert(result.afterKills.activeId === "generator", `Expected generator quest after kills, got ${result.afterKills.activeId}.`);
  assert(result.afterKills.completed.includes("killRobots"), `Expected kill quest completed, got ${JSON.stringify(result.afterKills.completed)}.`);
  assert(result.afterKills.killProgress === 5, `Expected 5 kill progress, got ${result.afterKills.killProgress}.`);
  assert(result.afterGenerator.activeId === "controlRoom", `Expected control room quest after generator, got ${result.afterGenerator.activeId}.`);
  assert(result.afterGenerator.generatorProgress === 1 && result.afterGenerator.generatorActive, `Expected generator completed, got ${JSON.stringify(result.afterGenerator)}.`);
  assert(result.afterControl.activeId === null, `Expected no active quest after control room, got ${result.afterControl.activeId}.`);
  assert(result.afterControl.controlProgress === 1 && result.afterControl.controlCaptured, `Expected control room completed, got ${JSON.stringify(result.afterControl)}.`);
  assert(result.afterControl.securityDisabled, "Capturing control room should disable security.");
});

check("cosmetics unlock from robot kills and stay cosmetic-only", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    const lockedSelect = game.cosmetics.select("cap");
    const beforeHp = game.player.hp;
    const beforeDamage = game.combat.damage;
    game.player.kills = 10;
    game.cosmetics.update(game.player.kills);
    const selectedAfterUnlock = game.cosmetics.selectedId;
    const selectedLabel = game.cosmetics.selected;
    const cosmeticMeshes = game.player.cosmeticMeshes.length;
    const selectedRobotSkin = game.cosmetics.select("robotSkin");
    return {
      lockedSelect,
      selectedAfterUnlock,
      selectedLabel,
      unlocked: ["cap", "helmet", "armor", "robotSkin"].filter((id) => game.cosmetics.unlocked.has(id)),
      selectedRobotSkin,
      playerCosmeticId: game.player.cosmeticId,
      cosmeticMeshes,
      hpUnchanged: game.player.hp === beforeHp,
      damageUnchanged: game.combat.damage === beforeDamage
    };
  });

  assert(!result.lockedSelect, "Locked cosmetic should not be selectable.");
  assert(result.unlocked.length === 4, `Expected all kill cosmetics unlocked, got ${JSON.stringify(result.unlocked)}.`);
  assert(result.selectedAfterUnlock === "robotSkin", `Expected latest unlocked cosmetic selected, got ${result.selectedAfterUnlock}.`);
  assert(result.selectedLabel.includes("Robot"), `Expected robot cosmetic label, got ${result.selectedLabel}.`);
  assert(result.selectedRobotSkin, "Unlocked robot skin should be selectable.");
  assert(result.playerCosmeticId === "robotSkin", `Expected player cosmetic id robotSkin, got ${result.playerCosmeticId}.`);
  assert(result.cosmeticMeshes > 0, "Selected cosmetic should create first-person cosmetic meshes.");
  assert(result.hpUnchanged && result.damageUnchanged, "Cosmetics should not change health or weapon damage.");
});

check("achievements unlock only when their gameplay conditions are met", async (page) => {
  const result = await page.evaluate(() => {
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.achievements.reset();
    game.player.kills = 100;
    game.achievements.onRobotKilled(game.player, { typeKey: "normal" }, { solo: true });
    game.achievements.onScrapCollected(1000);
    game.achievements.startRoom();
    game.achievements.onWaveCleared();
    const beforeBossParty = [...game.achievements.unlocked];
    game.achievements.reset();
    game.achievements.onRobotKilled(game.player, { typeKey: "boss" }, { solo: false });
    const partyBossUnlocked = game.achievements.unlocked.has("soloBoss");
    game.achievements.onRobotKilled(game.player, { typeKey: "boss" }, { solo: true });
    return {
      beforeBossParty,
      partyBossUnlocked,
      afterSoloBoss: [...game.achievements.unlocked],
      stats: { ...game.achievements.stats },
      rendered: [...document.querySelectorAll("#achievementList .achievement")].map((item) => item.textContent)
    };
  });

  assert(result.beforeBossParty.includes("robot100"), `Expected robot100 achievement, got ${JSON.stringify(result.beforeBossParty)}.`);
  assert(result.beforeBossParty.includes("scrap1000"), `Expected scrap1000 achievement, got ${JSON.stringify(result.beforeBossParty)}.`);
  assert(result.beforeBossParty.includes("noDeathRoom"), `Expected noDeathRoom achievement, got ${JSON.stringify(result.beforeBossParty)}.`);
  assert(!result.partyBossUnlocked, "Party boss kill should not unlock solo boss achievement.");
  assert(result.afterSoloBoss.includes("soloBoss"), `Solo boss kill should unlock soloBoss, got ${JSON.stringify(result.afterSoloBoss)}.`);
  assert(result.stats.soloBoss === 1, `Expected soloBoss stat 1, got ${result.stats.soloBoss}.`);
  assert(result.rendered.some((line) => line.includes("Boss'u tek basina yen") && line.includes("Acildi")), `Expected rendered solo boss unlock, got ${JSON.stringify(result.rendered)}.`);
});

await withBrowserGame(PORT, async ({ openPage }) => {
  const page = await openPage(() => Boolean(window.robotAvcisi?.robotManager));
  try {
    for (const { name, fn } of checks) {
      await fn(page);
      console.log(`ok - ${name}`);
    }
  } finally {
    await page.close();
  }
});

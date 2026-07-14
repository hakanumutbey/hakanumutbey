import { withBrowserGame } from "./helpers/browserGame.mjs";
import { assert } from "./helpers/testServer.mjs";

const PORT = Number(process.env.TEST_PARTY_BROWSER_PORT || 3139);

async function openPlayer(openPage, id, name) {
  const page = await openPage(() => Boolean(window.robotAvcisi?.party));
  await page.evaluate(({ id, name }) => {
    localStorage.removeItem("robotAvcisi.save.v1");
    const game = window.robotAvcisi;
    game.resetNewGame();
    game.menu.root.classList.add("hidden");
    game.started = true;
    game.party.id = id;
    game.party.ui.name.value = name;
    game.player.camera.position.copyFrom(game.factory.computerPosition);
    game.handleInteract();
  }, { id, name });
  return page;
}

async function partySnapshot(page) {
  return page.evaluate(() => {
    const game = window.robotAvcisi;
    return {
      code: game.party.code,
      isOwner: game.party.isOwner,
      ready: game.party.ready,
      started: game.party.started,
      gameStarted: game.started,
      ownerId: game.party.ownerId,
      otherPlayers: [...game.party.otherPlayers.values()],
      players: game.party.players,
      status: game.party.ui.status.textContent,
      computerOpen: game.hud.isComputerOpen(),
      startDisabled: game.party.ui.start.disabled,
      readyDisabled: game.party.ui.ready.disabled
    };
  });
}

await withBrowserGame(PORT, async ({ openPage }) => {
  const owner = await openPlayer(openPage, "owner", "Hakan");
  const guest = await openPlayer(openPage, "guest", "Emre");

  try {
    await owner.locator("#createPartyBtn").click();
    await owner.waitForFunction(() => window.robotAvcisi.party.code.length === 4);
    const ownerAfterCreate = await partySnapshot(owner);
    assert(ownerAfterCreate.computerOpen, "Owner should create party from the in-game computer panel.");
    assert(ownerAfterCreate.isOwner, "Creator should be party owner.");
    assert(ownerAfterCreate.code.length === 4, `Expected 4-character party code, got ${ownerAfterCreate.code}.`);

    await guest.fill("#partyCodeInput", ownerAfterCreate.code);
    await guest.locator("#joinPartyBtn").click();
    await owner.waitForFunction(() => window.robotAvcisi.party.otherPlayers.has("guest"));
    await guest.waitForFunction(() => window.robotAvcisi.party.otherPlayers.has("owner"));

    const afterJoinOwner = await partySnapshot(owner);
    const afterJoinGuest = await partySnapshot(guest);
    assert(afterJoinOwner.players.length === 2, `Owner should see two players, got ${afterJoinOwner.players.length}.`);
    assert(afterJoinGuest.players.length === 2, `Guest should see two players, got ${afterJoinGuest.players.length}.`);
    assert(afterJoinGuest.ownerId === "owner" && !afterJoinGuest.isOwner, "Guest should see owner as leader.");
    assert(afterJoinOwner.otherPlayers[0]?.name === "Emre", `Owner should see guest name, got ${JSON.stringify(afterJoinOwner.otherPlayers)}.`);

    await owner.locator("#readyBtn").click();
    await guest.locator("#readyBtn").click();
    await owner.waitForFunction(() => window.robotAvcisi.party.players.every((player) => player.ready));
    const readyOwner = await partySnapshot(owner);
    assert(readyOwner.ready, "Owner should be marked ready.");
    assert(!readyOwner.startDisabled, "Owner start button should enable when everyone is ready.");

    await owner.locator("#startPartyBtn").click();
    await owner.waitForFunction(() => window.robotAvcisi.party.started);
    await guest.waitForFunction(() => window.robotAvcisi.party.started);
    const startedGuest = await partySnapshot(guest);
    assert(startedGuest.started && startedGuest.gameStarted, "Guest game should start when party owner starts.");

    await guest.evaluate(() => {
      const game = window.robotAvcisi;
      game.player.camera.position.set(4.25, 1.7, -3.5);
      game.player.hp = 64;
      game.combat.unlockWeapon("scrapRifle", { silent: true });
      game.combat.activeWeaponId = "scrapRifle";
      game.combat.upgradeLevel = 2;
      game.cosmetics.unlocked.add("robotSkin");
      game.cosmetics.select("robotSkin");
      game.inventory.battery = 35;
      game.flashlight.enabled = true;
      game.party.update(performance.now() + 1000);
    });

    await owner.waitForFunction(() => {
      const player = window.robotAvcisi.party.otherPlayers.get("guest");
      return player?.weaponId === "scrapRifle" && player?.cosmeticId === "robotSkin" && player?.flashlightOn === true;
    });

    const avatarSnapshot = await owner.evaluate(() => {
      const game = window.robotAvcisi;
      game.partyAvatars.update();
      const player = game.party.otherPlayers.get("guest");
      const avatar = game.partyAvatars.avatars.get("guest");
      return {
        player,
        hasAvatar: Boolean(avatar),
        avatarPosition: avatar ? {
          x: Number(avatar.root.position.x.toFixed(2)),
          z: Number(avatar.root.position.z.toFixed(2))
        } : null,
        cosmeticId: avatar?.cosmeticId,
        weaponId: avatar?.weaponId,
        weaponUpgradeLevel: avatar?.weaponUpgradeLevel,
        flashlightOn: avatar?.flashlightOn,
        healthRatio: avatar ? Number(avatar.healthFill.scaling.x.toFixed(2)) : 0
      };
    });

    assert(avatarSnapshot.hasAvatar, "Owner should render a remote avatar for the guest.");
    assert(avatarSnapshot.weaponId === "scrapRifle", `Expected synced scrapRifle, got ${avatarSnapshot.weaponId}.`);
    assert(avatarSnapshot.weaponUpgradeLevel === 2, `Expected synced upgrade level 2, got ${avatarSnapshot.weaponUpgradeLevel}.`);
    assert(avatarSnapshot.cosmeticId === "robotSkin", `Expected synced robotSkin, got ${avatarSnapshot.cosmeticId}.`);
    assert(avatarSnapshot.flashlightOn, "Expected synced remote flashlight.");
    assert(avatarSnapshot.healthRatio > 0.6 && avatarSnapshot.healthRatio < 0.7, `Expected health bar around 64%, got ${avatarSnapshot.healthRatio}.`);
    assert(Math.abs(avatarSnapshot.player.x - 4.25) < 0.01, `Expected synced guest x position, got ${avatarSnapshot.player.x}.`);

    await guest.evaluate(() => {
      window.robotAvcisi.party.send({ type: "chat", text: "/dans" });
    });
    await owner.waitForFunction(() => {
      const game = window.robotAvcisi;
      const avatar = game.partyAvatars.avatars.get("guest");
      return game.hud.logLines.some((line) => line.includes("Emre") && line.includes("dans")) && avatar?.emote === "dance";
    });

    const remoteCommand = await owner.evaluate(() => ({
      logs: window.robotAvcisi.hud.logLines,
      emote: window.robotAvcisi.partyAvatars.avatars.get("guest")?.emote
    }));
    assert(remoteCommand.emote === "dance", `Expected remote dance emote, got ${remoteCommand.emote}.`);
    console.log("ok - browser party create, join, ready, start, avatar sync, and remote command");
  } finally {
    await owner.close();
    await guest.close();
  }
});

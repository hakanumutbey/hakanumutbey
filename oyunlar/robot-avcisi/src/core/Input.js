export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.keybinds = {
      interact: "e",
      sneak: "c",
      place: "f",
      cycleHelper: "g",
      craftWeapon: "r",
      reclaimBench: "t",
      dropItem: "v",
      flashlight: "q"
    };
    this.interactPressed = false;
    this.placePressed = false;
    this.cycleHelperPressed = false;
    this.craftWeaponPressed = false;
    this.reclaimBenchPressed = false;
    this.dropItemPressed = false;
    this.flashlightPressed = false;
    this.weaponSlotPressed = null;

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (key === this.keybinds.interact) this.interactPressed = true;
      if (key === this.keybinds.place) this.placePressed = true;
      if (key === this.keybinds.cycleHelper) this.cycleHelperPressed = true;
      if (key === this.keybinds.craftWeapon) this.craftWeaponPressed = true;
      if (key === this.keybinds.reclaimBench) this.reclaimBenchPressed = true;
      if (key === this.keybinds.dropItem) this.dropItemPressed = true;
      if (key === this.keybinds.flashlight) this.flashlightPressed = true;
      if (["1", "2", "3"].includes(key)) this.weaponSlotPressed = Number(key);
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
  }

  consumeInteract() {
    const pressed = this.interactPressed;
    this.interactPressed = false;
    return pressed;
  }

  consumePlace() {
    const pressed = this.placePressed;
    this.placePressed = false;
    return pressed;
  }

  consumeCycleHelper() {
    const pressed = this.cycleHelperPressed;
    this.cycleHelperPressed = false;
    return pressed;
  }

  consumeCraftWeapon() {
    const pressed = this.craftWeaponPressed;
    this.craftWeaponPressed = false;
    return pressed;
  }

  consumeReclaimBench() {
    const pressed = this.reclaimBenchPressed;
    this.reclaimBenchPressed = false;
    return pressed;
  }

  consumeDropItem() {
    const pressed = this.dropItemPressed;
    this.dropItemPressed = false;
    return pressed;
  }

  consumeFlashlightToggle() {
    const pressed = this.flashlightPressed;
    this.flashlightPressed = false;
    return pressed;
  }

  consumeWeaponSlot() {
    const slot = this.weaponSlotPressed;
    this.weaponSlotPressed = null;
    return slot;
  }

  isDown(key) {
    return this.keys.has(key);
  }

  isActionDown(action) {
    const key = this.keybinds[action];
    return Boolean(key && this.isDown(key));
  }

  updateKeybind(action, key) {
    if (!key) return;
    this.keybinds[action] = key.toLowerCase();
  }
}

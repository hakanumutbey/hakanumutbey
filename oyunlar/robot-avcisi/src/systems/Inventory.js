import { GAME_CONFIG } from "../config.js";

export class Inventory {
  constructor() {
    this.scrap = 0;
    this.capacity = GAME_CONFIG.player.backpackCapacity;
    this.battery = GAME_CONFIG.player.batteryCapacity;
    this.batteryPacks = 0;
    this.totalScrapCollected = 0;
    this.robotParts = 0;
    this.totalRobotPartsCollected = 0;
  }

  addScrap(amount) {
    const before = this.scrap;
    this.scrap += this.fitAmount(amount);
    const added = this.scrap - before;
    this.totalScrapCollected += added;
    return added;
  }

  returnScrap(amount) {
    const before = this.scrap;
    this.scrap += this.fitAmount(amount);
    return this.scrap - before;
  }

  removeScrap(amount) {
    if (this.scrap < amount) return false;
    this.scrap -= amount;
    return true;
  }

  addRobotParts(amount) {
    const before = this.robotParts;
    this.robotParts += this.fitAmount(amount);
    const added = this.robotParts - before;
    this.totalRobotPartsCollected += added;
    return added;
  }

  returnRobotParts(amount) {
    const before = this.robotParts;
    this.robotParts += this.fitAmount(amount);
    return this.robotParts - before;
  }

  removeRobotParts(amount) {
    if (this.robotParts < amount) return false;
    this.robotParts -= amount;
    return true;
  }

  isFull() {
    return this.usedSlots() >= this.capacity;
  }

  usedSlots() {
    return this.scrap + this.robotParts + this.batteryPacks;
  }

  freeSlots() {
    return Math.max(0, this.capacity - this.usedSlots());
  }

  clampToCapacity() {
    if (this.usedSlots() <= this.capacity) return;
    const overflow = this.usedSlots() - this.capacity;
    const scrapRemoved = Math.min(this.scrap, overflow);
    this.scrap -= scrapRemoved;
    const remainingOverflow = overflow - scrapRemoved;
    const partsRemoved = Math.min(this.robotParts, remainingOverflow);
    this.robotParts -= partsRemoved;
    const batteryOverflow = remainingOverflow - partsRemoved;
    if (batteryOverflow > 0) this.batteryPacks = Math.max(0, this.batteryPacks - batteryOverflow);
  }

  addBattery(amount) {
    const before = this.battery;
    this.battery = Math.min(GAME_CONFIG.player.batteryCapacity, this.battery + amount);
    return this.battery - before;
  }

  addBatteryPack(amount = 1) {
    const before = this.batteryPacks;
    this.batteryPacks += this.fitAmount(amount);
    return this.batteryPacks - before;
  }

  removeBatteryPack(amount = 1) {
    if (this.batteryPacks < amount) return false;
    this.batteryPacks -= amount;
    return true;
  }

  useBatteryPack(rechargeAmount) {
    if (this.batteryPacks <= 0 || this.battery >= GAME_CONFIG.player.batteryCapacity) return 0;
    this.batteryPacks -= 1;
    return this.addBattery(rechargeAmount);
  }

  collectBattery(rechargeAmount) {
    if (this.battery < GAME_CONFIG.player.batteryCapacity - 1) {
      const charged = this.addBattery(rechargeAmount);
      if (charged > 0) return { charged, stored: 0 };
    }
    const stored = this.addBatteryPack(1);
    return { charged: 0, stored };
  }

  drainBattery(amount) {
    const before = this.battery;
    this.battery = Math.max(0, this.battery - amount);
    return before - this.battery;
  }

  fitAmount(amount) {
    const count = Math.max(0, Math.floor(Number(amount) || 0));
    return Math.min(count, this.freeSlots());
  }
}

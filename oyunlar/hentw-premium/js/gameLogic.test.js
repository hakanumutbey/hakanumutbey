import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ARENA_HALF,
  BUILDINGS,
  BUILD_ORDER,
  HEART_HP,
  PLAYER_MAX_HP,
  WAVE_PERIOD,
  createInventory,
  addMaterial,
  canAfford,
  tryBuild,
  dangerLevel,
  spawnInterval,
  maxMonsters,
  monsterStats,
  waveNumber,
  waveBurstCount,
  computeScore,
  heartsFromHp,
  applyPlayerDamage,
  healTick,
  arenaClamp,
  pickNearest,
  makeRng,
  worldToMinimap,
} from "./gameLogic.js";

describe("malzeme ve inşa maliyetleri", () => {
  it("her yapının maliyeti tanımlı ve pozitif", () => {
    for (const id of BUILD_ORDER) {
      const def = BUILDINGS[id];
      assert.ok(def, id);
      assert.ok(def.cost.kristal > 0 || def.cost.metal > 0);
      assert.ok(def.hp > 0);
    }
  });

  it("canAfford doğru çalışır", () => {
    const inv = createInventory(2, 3);
    assert.equal(canAfford(inv, BUILDINGS.wall.cost), true);
    assert.equal(canAfford(inv, BUILDINGS.turret.cost), false); // metal 5 gerek
    assert.equal(canAfford(inv, { kristal: 0, metal: 3 }), true);
  });

  it("yetersiz malzemeyle inşa reddedilir, envanter değişmez", () => {
    const inv = createInventory(0, 1);
    const r = tryBuild(inv, "wall");
    assert.equal(r.ok, false);
    assert.equal(r.reason, "malzeme");
    assert.deepEqual(r.inventory, inv);
  });

  it("yeterli malzemeyle inşa maliyeti düşer", () => {
    const inv = createInventory(5, 5);
    const r = tryBuild(inv, "turret");
    assert.equal(r.ok, true);
    assert.equal(r.inventory.kristal, 5 - BUILDINGS.turret.cost.kristal);
    assert.equal(r.inventory.metal, 5 - BUILDINGS.turret.cost.metal);
    // orijinal envanter bozulmamalı
    assert.deepEqual(inv, { kristal: 5, metal: 5 });
  });

  it("bilinmeyen yapı reddedilir", () => {
    const r = tryBuild(createInventory(99, 99), "uzay_gemisi");
    assert.equal(r.ok, false);
    assert.equal(r.reason, "bilinmeyen");
  });

  it("addMaterial malzeme ekler", () => {
    let inv = createInventory();
    inv = addMaterial(inv, "kristal", 2);
    inv = addMaterial(inv, "metal", 1);
    assert.deepEqual(inv, { kristal: 2, metal: 1 });
  });
});

describe("tehlike ve spawn ölçekleme", () => {
  it("tehlike seviyesi zamanla monoton artar", () => {
    let prev = 0;
    for (let t = 0; t <= 600; t += 17) {
      const d = dangerLevel(t);
      assert.ok(d >= prev, `t=${t}`);
      prev = d;
    }
    assert.equal(dangerLevel(0), 1);
    assert.ok(dangerLevel(10000) <= 10); // tavan
  });

  it("spawn aralığı zamanla monoton kısalır ve 3 sn altına inmez", () => {
    let prev = Infinity;
    for (let t = 0; t <= 600; t += 23) {
      const s = spawnInterval(t);
      assert.ok(s <= prev, `t=${t}: ${s} > ${prev}`);
      assert.ok(s >= 3);
      prev = s;
    }
  });

  it("maksimum canavar sayısı zamanla monoton artar", () => {
    let prev = 0;
    for (let t = 0; t <= 600; t += 29) {
      const m = maxMonsters(t);
      assert.ok(m >= prev, `t=${t}`);
      prev = m;
    }
  });

  it("canavar gücü artar ama hızı oyuncunun altında kalır (kaçış hep mümkün)", () => {
    let prevHp = 0;
    for (let t = 0; t <= 600; t += 31) {
      const st = monsterStats(t);
      assert.ok(st.hp >= prevHp);
      assert.ok(st.speed < 8.5, `t=${t} hız=${st.speed}`);
      prevHp = st.hp;
    }
  });

  it("kolay mod: daha az ve daha yavaş canavar", () => {
    for (const t of [0, 120, 300]) {
      assert.ok(spawnInterval(t, true) > spawnInterval(t, false));
      assert.ok(maxMonsters(t, true) <= maxMonsters(t, false));
      assert.ok(monsterStats(t, true).hp <= monsterStats(t, false).hp);
      assert.ok(monsterStats(t, true).speed <= monsterStats(t, false).speed);
    }
  });

  it("dalga sayısı ve dalga gücü", () => {
    assert.equal(waveNumber(0), 0);
    assert.equal(waveNumber(WAVE_PERIOD - 1), 0);
    assert.equal(waveNumber(WAVE_PERIOD), 1);
    assert.equal(waveNumber(WAVE_PERIOD * 3 + 5), 3);
    assert.ok(waveBurstCount(500) >= waveBurstCount(0));
    assert.ok(waveBurstCount(0) >= 2);
  });
});

describe("skor", () => {
  it("formül: süre + kristal*5 + metal*3 + öldürme*10", () => {
    assert.equal(
      computeScore({ timeSec: 61.7, kristal: 4, metal: 2, kills: 3 }),
      61 + 20 + 6 + 30
    );
  });

  it("süre ile monoton artar", () => {
    const base = { kristal: 2, metal: 2, kills: 1 };
    assert.ok(
      computeScore({ ...base, timeSec: 100 }) > computeScore({ ...base, timeSec: 10 })
    );
  });

  it("boş değerlerle 0", () => {
    assert.equal(computeScore({}), 0);
  });
});

describe("can ve kalp kuralları", () => {
  it("3 kalp = maksimum can", () => {
    assert.equal(PLAYER_MAX_HP / HEART_HP, 3);
    assert.equal(heartsFromHp(PLAYER_MAX_HP), 3);
    assert.equal(heartsFromHp(HEART_HP * 2), 2);
    assert.equal(heartsFromHp(1), 1); // kırıntı can bile 1 kalp gösterir
    assert.equal(heartsFromHp(0), 0);
  });

  it("hasar canı 0'ın altına indirmez", () => {
    assert.equal(applyPlayerDamage(30, HEART_HP), 10);
    assert.equal(applyPlayerDamage(10, 999), 0);
    assert.equal(applyPlayerDamage(10, -5), 10);
  });

  it("can istasyonu yavaşça doldurur ve maksimumu aşmaz", () => {
    const hp = applyPlayerDamage(PLAYER_MAX_HP, HEART_HP); // 40
    const healed = healTick(hp, 1); // 1 sn bekle
    assert.ok(healed > hp);
    assert.ok(healed <= PLAYER_MAX_HP);
    assert.equal(healTick(PLAYER_MAX_HP - 1, 10), PLAYER_MAX_HP); // taşma yok
    assert.equal(healTick(PLAYER_MAX_HP, 5), PLAYER_MAX_HP);
    assert.equal(healTick(50, 0), 50); // dt=0 ise değişmez
  });
});

describe("harita ve yardımcılar", () => {
  it("arenaClamp sınır dışını yumuşak duvarla geri iter", () => {
    const inR = arenaClamp(0, 0);
    assert.equal(inR.pushed, false);
    const out = arenaClamp(ARENA_HALF + 50, -ARENA_HALF - 50);
    assert.equal(out.pushed, true);
    assert.ok(out.x <= ARENA_HALF);
    assert.ok(out.z >= -ARENA_HALF);
  });

  it("pickNearest en yakın noktayı bulur", () => {
    const items = [{ x: 10, z: 0 }, { x: 2, z: 0 }, { x: -8, z: 0 }];
    assert.equal(pickNearest(items, 0, 0), 1);
    assert.equal(pickNearest(items, 0, 0, 1), -1); // menzil dışı
    assert.equal(pickNearest([], 0, 0), -1);
  });

  it("makeRng aynı seed ile aynı diziyi üretir", () => {
    const a = makeRng(42);
    const b = makeRng(42);
    for (let i = 0; i < 5; i++) assert.equal(a(), b());
    const v = makeRng(42)();
    assert.ok(v >= 0 && v < 1);
  });

  it("worldToMinimap orta nokta ve kenar", () => {
    const b = { minX: -ARENA_HALF, maxX: ARENA_HALF, minZ: -ARENA_HALF, maxZ: ARENA_HALF };
    const mid = worldToMinimap(0, 0, b, 120);
    assert.ok(Math.abs(mid.x - 60) < 0.01);
    assert.ok(Math.abs(mid.y - 60) < 0.01);
    const edge = worldToMinimap(-ARENA_HALF, ARENA_HALF, b, 120);
    assert.equal(edge.x, 0);
    assert.equal(edge.y, 120);
  });
});

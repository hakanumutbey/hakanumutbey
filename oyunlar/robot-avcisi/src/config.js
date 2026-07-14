export const GAME_CONFIG = {
  player: {
    height: 1.7,
    sneakHeight: 1.15,
    speed: 0.18,
    sprintSpeed: 0.28,
    sneakSpeed: 0.08,
    hp: 100,
    backpackCapacity: 20,
    batteryCapacity: 100
  },
  world: {
    minX: -9.8,
    maxX: 9.8,
    minZ: -7.8,
    maxZ: 7.8
  },
  combat: {
    baseDamage: 24,
    fireCooldownMs: 260,
    range: 80
  },
  weapons: [
    {
      id: "pistol",
      label: "Tabanca",
      slot: 1,
      damage: 24,
      fireCooldownMs: 260,
      range: 80,
      color: [0.18, 0.2, 0.19],
      starter: true
    },
    {
      id: "scrapRifle",
      label: "Hurda Tufegi",
      slot: 2,
      damage: 34,
      fireCooldownMs: 340,
      range: 88,
      color: [0.44, 0.3, 0.18],
      recipe: { scrap: 6, parts: 3 }
    },
    {
      id: "ionBlaster",
      label: "Iyon Patlatici",
      slot: 3,
      damage: 48,
      fireCooldownMs: 520,
      range: 95,
      splashRadius: 3.2,
      splashDamageMultiplier: 0.58,
      color: [0.22, 0.55, 0.85],
      recipe: { scrap: 10, parts: 6 }
    }
  ],
  crafting: {
    scrapPerUpgrade: 5,
    damagePerUpgrade: 8,
    partsPerHelperRobot: 4
  },
  party: {
    maxPlayers: 5,
    maxParties: 3
  },
  partyState: {
    maxRoom: 999,
    maxY: 3.2
  },
  flashlight: {
    drainPerSecond: 4.5,
    rechargePerBattery: 35
  },
  healthStation: {
    maxCharges: 3,
    healAmount: 45,
    useCooldownMs: 1200,
    rechargeMs: 18000
  },
  power: {
    firstOutageMs: 25000,
    outageEveryMs: 45000,
    robotSpeedMultiplier: 1.28,
    robotDamageMultiplier: 1.12,
    groundZigzagStrength: 0.42,
    droneHoverSwing: 0.48
  },
  alarm: {
    explosionsTriggerAlarm: true,
    shotsToTrigger: 18,
    durationMs: 24000,
    reinforcementEveryMs: 5200,
    initialReinforcements: 2,
    reinforcementsPerWave: 1,
    maxReinforcementWaves: 4,
    extraActiveRobots: 4,
    reinforcementTypes: ["shield", "drone", "fast"]
  },
  security: {
    detectionRate: 0.022,
    sneakingDetectionRate: 0.006,
    detectionCooldownRate: 0.014,
    sneakingRangeMultiplier: 0.55,
    sneakingFovMultiplier: 0.58,
    cameraPromptRadius: 5.2
  },
  development: {
    testCommandsEnabled: false
  },
  difficulty: {
    easy: {
      label: "Kolay",
      spawnMultiplier: 0.75,
      hpMultiplier: 0.8,
      damageMultiplier: 0.72,
      speedMultiplier: 0.9,
      scrapMultiplier: 1.25,
      maxRobots: 8
    },
    normal: {
      label: "Normal",
      spawnMultiplier: 1,
      hpMultiplier: 1,
      damageMultiplier: 1,
      speedMultiplier: 1,
      scrapMultiplier: 1,
      maxRobots: 10
    },
    hard: {
      label: "Zor",
      spawnMultiplier: 1.25,
      hpMultiplier: 1.28,
      damageMultiplier: 1.35,
      speedMultiplier: 1.12,
      scrapMultiplier: 1,
      maxRobots: 12
    }
  },
  cosmetics: {
    starter: "Yok",
    items: [
      {
        id: "none",
        label: "Yok",
        kind: "none",
        unlock: { type: "starter" }
      },
      {
        id: "cap",
        label: "Hurda Sapkasi",
        kind: "hat",
        color: [0.95, 0.78, 0.24],
        unlock: { type: "kills", value: 2 }
      },
      {
        id: "helmet",
        label: "Robot Kaski",
        kind: "helmet",
        color: [0.42, 0.86, 1],
        unlock: { type: "kills", value: 3 }
      },
      {
        id: "armor",
        label: "Robot Kostumu",
        kind: "armor",
        color: [0.72, 0.42, 1],
        unlock: { type: "kills", value: 6 }
      },
      {
        id: "robotSkin",
        label: "Neon Robot Gorunumu",
        kind: "robotSkin",
        color: [0.2, 0.95, 1],
        unlock: { type: "kills", value: 10 }
      }
    ]
  },
  helperRobots: {
    miner: {
      label: "Madenci robot",
      speed: 0.045,
      range: 7,
      color: [0.95, 0.78, 0.2]
    },
    fighter: {
      label: "Savasci robot",
      speed: 0.052,
      range: 8,
      damage: 10,
      attackCooldown: 900,
      color: [0.25, 0.75, 1]
    }
  }
};

export const QUESTS = {
  killRobots: {
    id: "killRobots",
    label: "5 robotu yok et",
    target: 5
  },
  generator: {
    id: "generator",
    label: "Jeneratoru calistir",
    target: 1
  },
  controlRoom: {
    id: "controlRoom",
    label: "Kontrol odasini ele gecir",
    target: 1
  }
};

export const ACHIEVEMENTS = [
  {
    id: "robot100",
    label: "100 robot yok et",
    target: 100
  },
  {
    id: "noDeathRoom",
    label: "Hic olmeden bolumu bitir",
    target: 1
  },
  {
    id: "scrap1000",
    label: "1000 hurda topla",
    target: 1000
  },
  {
    id: "soloBoss",
    label: "Boss'u tek basina yen",
    target: 1
  }
];

export const ROBOT_TYPES = {
  normal: {
    label: "Normal robot",
    hp: 52,
    speed: 0.035,
    damage: 6,
    scrap: 2,
    parts: 1,
    color: [0.78, 0.22, 0.18],
    size: 0.72
  },
  fast: {
    label: "Hizli robot",
    hp: 34,
    speed: 0.065,
    damage: 4,
    scrap: 2,
    parts: 1,
    color: [0.95, 0.62, 0.16],
    size: 0.58
  },
  shield: {
    label: "Kalkanli robot",
    hp: 90,
    speed: 0.025,
    damage: 8,
    scrap: 4,
    parts: 2,
    color: [0.23, 0.42, 0.9],
    size: 0.86,
    shield: 0.45
  },
  drone: {
    label: "Ucan drone",
    hp: 38,
    speed: 0.055,
    damage: 5,
    scrap: 3,
    parts: 2,
    color: [0.7, 0.35, 0.85],
    size: 0.48,
    flying: true
  },
  boss: {
    label: "Dev boss robot",
    hp: 260,
    speed: 0.018,
    damage: 16,
    scrap: 10,
    parts: 5,
    color: [0.45, 0.08, 0.08],
    size: 1.22
  }
};

export const ROOM_DEFINITIONS = [
  {
    id: "lab",
    name: "Laboratuvar",
    floorColor: [0.12, 0.16, 0.15],
    wallColor: [0.32, 0.39, 0.36],
    lightColor: [0.78, 0.95, 0.84],
    lightIntensity: 0.75,
    ambientIntensity: 0.46,
    robotPlan: ["normal", "normal", "fast", "shield", "drone"],
    robotCountBase: 4,
    spawnZones: [
      { minX: -8, maxX: 8, minZ: 4, maxZ: 7.5 }
    ],
    batteries: [
      [-8.2, 0.25, 1.8],
      [2.2, 0.25, 5.9],
      [8.4, 0.25, -2.5]
    ],
    props: [
      { type: "crate", x: -4.2, z: 1.8, w: 1.1, d: 1.1 },
      { type: "crate", x: 2.4, z: 2.8, w: 1.3, d: 1.1 },
      { type: "barrel", x: 6.4, z: -1.4 },
      { type: "lowWall", x: 0, z: 1.2, w: 3.2, d: 0.5 }
    ]
  },
  {
    id: "darkStorage",
    name: "Karanlik Depo",
    floorColor: [0.08, 0.1, 0.11],
    wallColor: [0.22, 0.25, 0.27],
    lightColor: [0.55, 0.7, 0.95],
    lightIntensity: 0.45,
    ambientIntensity: 0.18,
    robotPlan: ["fast", "fast", "normal", "drone", "shield"],
    robotCountBase: 5,
    spawnZones: [
      { minX: -8.2, maxX: -2, minZ: 2.5, maxZ: 7.5 },
      { minX: 2, maxX: 8.2, minZ: 2.5, maxZ: 7.5 }
    ],
    batteries: [
      [-7.5, 0.25, -1.8],
      [7.6, 0.25, 4.9]
    ],
    props: [
      { type: "crate", x: -5.8, z: 2.7, w: 1.4, d: 1.4 },
      { type: "crate", x: -3.6, z: 4.9, w: 1.1, d: 1.1 },
      { type: "crate", x: 4.1, z: 4.2, w: 1.5, d: 1.2 },
      { type: "lowWall", x: 0, z: 3.4, w: 1.0, d: 4.2 },
      { type: "barrel", x: 7.3, z: 0.8 }
    ]
  },
  {
    id: "controlWing",
    name: "Kontrol Kanadi",
    floorColor: [0.11, 0.14, 0.18],
    wallColor: [0.24, 0.31, 0.42],
    lightColor: [0.65, 0.9, 1],
    lightIntensity: 0.68,
    ambientIntensity: 0.38,
    robotPlan: ["shield", "normal", "drone", "fast", "shield"],
    robotCountBase: 5,
    spawnZones: [
      { minX: -8, maxX: 8, minZ: 3.5, maxZ: 7.2 }
    ],
    batteries: [
      [6.2, 0.25, -4.8],
      [-2.5, 0.25, 6.5]
    ],
    props: [
      { type: "console", x: -5.6, z: 2.8, w: 1.6, d: 0.75 },
      { type: "console", x: 5.4, z: 2.8, w: 1.6, d: 0.75 },
      { type: "lowWall", x: -2, z: 0.8, w: 0.8, d: 2.8 },
      { type: "lowWall", x: 2, z: 0.8, w: 0.8, d: 2.8 },
      { type: "barrel", x: 0, z: 5.4 }
    ]
  },
  {
    id: "bossBay",
    name: "Boss Bolmesi",
    floorColor: [0.16, 0.11, 0.1],
    wallColor: [0.37, 0.24, 0.22],
    lightColor: [1, 0.52, 0.35],
    lightIntensity: 0.62,
    ambientIntensity: 0.32,
    robotPlan: ["boss", "shield", "drone", "fast", "normal"],
    robotCountBase: 4,
    spawnZones: [
      { minX: -4.5, maxX: 4.5, minZ: 4.8, maxZ: 7.2 }
    ],
    batteries: [
      [-8.2, 0.25, 6.2],
      [8.2, 0.25, 6.2]
    ],
    props: [
      { type: "lowWall", x: -5.8, z: 2.1, w: 1.1, d: 3.6 },
      { type: "lowWall", x: 5.8, z: 2.1, w: 1.1, d: 3.6 },
      { type: "crate", x: -2.8, z: 1.2, w: 1.1, d: 1.1 },
      { type: "crate", x: 2.8, z: 1.2, w: 1.1, d: 1.1 },
      { type: "barrel", x: 0, z: 0.4 }
    ]
  }
];

export function getRoomDefinition(roomNumber) {
  return ROOM_DEFINITIONS[(Math.max(1, roomNumber) - 1) % ROOM_DEFINITIONS.length];
}

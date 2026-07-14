import { GAME_CONFIG } from "../config.js";

export class SecuritySystem {
  constructor(scene, factory, hud, onAlarm) {
    this.scene = scene;
    this.factory = factory;
    this.hud = hud;
    this.onAlarm = onAlarm;
    this.cameras = [];
    this.sweep = 0;
    this.cooldown = 0;
    this.detection = 0;
    this.lastWatching = false;
    this.disabled = false;
    this.materials = this.createMaterials();
    this.createCameras();
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  update(player, delta, active, alarmActive) {
    this.sweep += delta * 0.018;
    this.cooldown = Math.max(0, this.cooldown - delta);

    for (const camera of this.cameras) {
      this.updateCameraVisual(camera, alarmActive);
    }

    if (this.disabled || !active || alarmActive || this.cooldown > 0) {
      this.coolDetection(delta);
      this.lastWatching = false;
      return;
    }

    const spotted = this.cameras.some((camera) => this.canSeePlayer(camera, player.position, player.isSneaking));
    if (spotted) {
      this.detection = Math.min(1, this.detection + this.detectionRate(player.isSneaking) * delta);
      this.lastWatching = true;
    } else {
      this.coolDetection(delta);
      this.lastWatching = false;
    }

    if (this.detection >= 1) {
      this.detection = 0;
      this.cooldown = 240;
      this.onAlarm(this.t("logSecurityCameraSpotted"));
    }
  }

  updateCameraVisual(camera, alarmActive) {
    const yaw = camera.baseYaw + Math.sin(this.sweep + camera.phase) * 0.65;
    const forward = this.forwardFromYaw(yaw);
    camera.head.rotation.y = yaw;
    camera.cone.rotation.y = yaw;
    camera.cone.position = camera.head.position.add(forward.scale(camera.coneOffset)).add(new BABYLON.Vector3(0, -1.15, 0));
    camera.head.material = this.disabled ? this.materials.disabledBody : this.materials.body;
    camera.cone.material = this.disabled ? this.materials.disabledCone : alarmActive ? this.materials.alertCone : this.materials.cone;
  }

  setDisabled(disabled) {
    this.disabled = Boolean(disabled);
    this.cooldown = 0;
    this.detection = 0;
    this.lastWatching = false;
    for (const camera of this.cameras) this.updateCameraVisual(camera, false);
  }

  serialize() {
    return {
      disabled: this.disabled,
      detection: this.detection,
      cooldown: this.cooldown
    };
  }

  load(data = {}) {
    this.disabled = Boolean(data.disabled);
    this.detection = this.disabled ? 0 : clamp01(data.detection);
    this.cooldown = this.disabled ? 0 : Math.max(0, numberOr(data.cooldown, 0));
    this.lastWatching = false;
    for (const camera of this.cameras) this.updateCameraVisual(camera, false);
  }

  detectionRate(sneaking) {
    return sneaking ? GAME_CONFIG.security.sneakingDetectionRate : GAME_CONFIG.security.detectionRate;
  }

  coolDetection(delta) {
    this.detection = Math.max(0, this.detection - GAME_CONFIG.security.detectionCooldownRate * delta);
  }

  detectionPercent() {
    return Math.round(this.detection * 100);
  }

  isNearActiveCamera(playerPosition, radius = GAME_CONFIG.security.cameraPromptRadius) {
    if (this.disabled || !playerPosition) return false;
    return this.cameras.some((camera) => {
      const position = camera.head.getAbsolutePosition();
      return flatDistance(position, playerPosition) <= radius;
    });
  }

  canSeePlayer(camera, playerPosition, sneaking = false) {
    const origin = camera.head.getAbsolutePosition();
    const toPlayer = playerPosition.subtract(origin);
    const distance = toPlayer.length();
    if (distance < 0.01) return false;
    const range = sneaking ? camera.range * GAME_CONFIG.security.sneakingRangeMultiplier : camera.range;
    if (distance > range) return false;

    const forward = this.forwardFromYaw(camera.head.rotation.y);
    const flat = new BABYLON.Vector3(toPlayer.x, 0, toPlayer.z);
    if (flat.length() < 0.01) return false;
    flat.normalize();
    const angle = Math.acos(clamp01Signed(BABYLON.Vector3.Dot(forward, flat)));
    const fov = sneaking ? camera.fov * GAME_CONFIG.security.sneakingFovMultiplier : camera.fov;
    if (angle > fov / 2) return false;

    const ray = new BABYLON.Ray(origin, toPlayer.normalize(), distance);
    const hit = this.scene.pickWithRay(ray, (mesh) => mesh.checkCollisions && !mesh.name.startsWith("securityCamera"));
    return !hit?.hit;
  }

  forwardFromYaw(yaw) {
    return new BABYLON.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  }

  createCameras() {
    const configs = [
      { pos: new BABYLON.Vector3(-9.5, 2.75, -1.5), yaw: Math.PI / 2, phase: 0 },
      { pos: new BABYLON.Vector3(9.5, 2.75, 1.5), yaw: -Math.PI / 2, phase: 1.7 },
      { pos: new BABYLON.Vector3(0, 2.8, 8.5), yaw: Math.PI, phase: 3.1 }
    ];

    for (const config of configs) {
      const head = BABYLON.MeshBuilder.CreateBox("securityCameraHead", { width: 0.46, height: 0.28, depth: 0.38 }, this.scene);
      head.position = config.pos;
      head.rotation.y = config.yaw;
      head.material = this.materials.body;

      const cone = BABYLON.MeshBuilder.CreateCylinder("securityCameraCone", {
        diameterTop: 0.16,
        diameterBottom: 2.6,
        height: 4.2,
        tessellation: 24
      }, this.scene);
      cone.position = config.pos.add(new BABYLON.Vector3(0, -1.15, 1.65));
      cone.rotation.x = Math.PI / 2;
      cone.rotation.y = config.yaw;
      cone.material = this.materials.cone;
      cone.isPickable = false;

      this.cameras.push({
        head,
        cone,
        baseYaw: config.yaw,
        phase: config.phase,
        coneOffset: 2.1,
        range: 7,
        fov: Math.PI / 3
      });
    }
  }

  createMaterials() {
    const body = new BABYLON.StandardMaterial("securityCameraBodyMat", this.scene);
    body.diffuseColor = new BABYLON.Color3(0.08, 0.09, 0.1);

    const cone = new BABYLON.StandardMaterial("securityCameraConeMat", this.scene);
    cone.diffuseColor = new BABYLON.Color3(0.9, 0.95, 0.42);
    cone.alpha = 0.16;
    cone.emissiveColor = new BABYLON.Color3(0.4, 0.46, 0.12);

    const alertCone = new BABYLON.StandardMaterial("securityCameraAlertConeMat", this.scene);
    alertCone.diffuseColor = new BABYLON.Color3(1, 0.12, 0.08);
    alertCone.alpha = 0.22;
    alertCone.emissiveColor = new BABYLON.Color3(0.62, 0.05, 0.04);

    const disabledBody = new BABYLON.StandardMaterial("securityCameraDisabledBodyMat", this.scene);
    disabledBody.diffuseColor = new BABYLON.Color3(0.05, 0.08, 0.1);
    disabledBody.emissiveColor = new BABYLON.Color3(0.02, 0.08, 0.12);

    const disabledCone = new BABYLON.StandardMaterial("securityCameraDisabledConeMat", this.scene);
    disabledCone.diffuseColor = new BABYLON.Color3(0.22, 0.55, 0.72);
    disabledCone.alpha = 0.07;
    disabledCone.emissiveColor = new BABYLON.Color3(0.04, 0.18, 0.24);

    return { body, cone, alertCone, disabledBody, disabledCone };
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    logSecurityCameraSpotted: "Guvenlik kamerasi seni gordu."
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}

function flatDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, numberOr(value, 0)));
}

function clamp01Signed(value) {
  return Math.max(-1, Math.min(1, numberOr(value, 0)));
}

function numberOr(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

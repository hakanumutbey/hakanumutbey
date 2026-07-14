export class VoiceChatSystem {
  constructor(partyClient, hud, settings) {
    this.party = partyClient;
    this.hud = hud;
    this.settings = settings;
    this.enabled = false;
    this.localStream = null;
    this.peers = new Map();
    this.audioElements = new Map();
    this.transmitting = true;
    this.translate = null;
  }

  setTranslator(translate) {
    this.translate = translate;
  }

  t(key, replacements = {}) {
    return this.translate ? this.translate(key, replacements) : fallbackText(key, replacements);
  }

  async toggle() {
    if (this.enabled) {
      this.stop();
      return false;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      this.enabled = true;
      this.applySettings(this.settings);
      this.updatePushToTalk(false);
      this.hud.addLog(this.t("logVoiceChatOn"));
      this.syncPeers();
      return true;
    } catch {
      this.hud.addLog(this.t("logVoicePermissionDenied"));
      return false;
    }
  }

  stop() {
    for (const peer of this.peers.values()) peer.close();
    for (const audio of this.audioElements.values()) audio.remove();
    this.peers.clear();
    this.audioElements.clear();
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) track.stop();
    }
    this.localStream = null;
    this.enabled = false;
    this.transmitting = false;
    this.hud.addLog(this.t("logVoiceChatOff"));
  }

  async ensureEnabled() {
    if (this.enabled) return true;
    return this.toggle();
  }

  applySettings(settings = this.settings) {
    this.settings = settings;
    for (const audio of this.audioElements.values()) {
      audio.volume = this.remoteVolume();
    }
    if (this.enabled) this.updatePushToTalk(false);
  }

  update(input) {
    if (!this.enabled) return;
    const key = this.settings.keybinds?.pushToTalkKey || "x";
    this.updatePushToTalk(input?.isDown(key));
  }

  updatePushToTalk(vPressed) {
    const shouldTransmit = !this.settings.pushToTalk || Boolean(vPressed);
    if (this.transmitting === shouldTransmit) return;
    this.transmitting = shouldTransmit;
    this.setLocalTracksEnabled(shouldTransmit);
  }

  setLocalTracksEnabled(enabled) {
    if (!this.localStream) return;
    for (const track of this.localStream.getAudioTracks()) track.enabled = enabled;
  }

  remoteVolume() {
    return Math.max(0, Math.min(1, this.settings.voiceVolume * this.settings.playerVoiceVolume));
  }

  syncPeers() {
    if (!this.enabled || !this.party.code) return;
    const desired = [...this.party.otherPlayers.keys()];

    for (const id of desired) {
      if (!this.peers.has(id)) this.createPeer(id, this.party.playerId() < id);
    }

    for (const id of [...this.peers.keys()]) {
      if (!this.party.otherPlayers.has(id)) this.removePeer(id);
    }
  }

  async handleSignal(from, signal) {
    if (!this.enabled || !signal) return;
    const peer = this.peers.get(from) || this.createPeer(from, false);

    if (signal.description) {
      await peer.setRemoteDescription(signal.description);
      if (signal.description.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        this.sendSignal(from, { description: peer.localDescription });
      }
    }

    if (signal.candidate) {
      try {
        await peer.addIceCandidate(signal.candidate);
      } catch {
        this.hud.addLog(this.t("logVoiceCandidateRejected"));
      }
    }
  }

  createPeer(id, shouldOffer) {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) peer.addTrack(track, this.localStream);
    }

    peer.addEventListener("icecandidate", (event) => {
      if (event.candidate) this.sendSignal(id, { candidate: event.candidate });
    });

    peer.addEventListener("track", (event) => {
      const audio = this.audioElements.get(id) || document.createElement("audio");
      audio.autoplay = true;
      audio.playsInline = true;
      audio.srcObject = event.streams[0];
      audio.volume = this.remoteVolume();
      if (!this.audioElements.has(id)) document.body.appendChild(audio);
      this.audioElements.set(id, audio);
    });

    peer.addEventListener("connectionstatechange", () => {
      if (["failed", "closed", "disconnected"].includes(peer.connectionState)) this.removePeer(id);
    });

    this.peers.set(id, peer);

    if (shouldOffer) {
      peer.createOffer()
        .then((offer) => peer.setLocalDescription(offer))
        .then(() => this.sendSignal(id, { description: peer.localDescription }))
        .catch(() => this.hud.addLog(this.t("logVoiceConnectionFailed")));
    }

    return peer;
  }

  removePeer(id) {
    const peer = this.peers.get(id);
    if (peer) peer.close();
    this.peers.delete(id);
    const audio = this.audioElements.get(id);
    if (audio) audio.remove();
    this.audioElements.delete(id);
  }

  sendSignal(to, signal) {
    this.party.send({ type: "voice-signal", to, signal });
  }
}

function fallbackText(key, replacements = {}) {
  const text = {
    logVoiceChatOn: "Sesli sohbet acildi.",
    logVoiceChatOff: "Sesli sohbet kapandi.",
    logVoicePermissionDenied: "Mikrofon izni alinamadi.",
    logVoiceCandidateRejected: "Ses baglantisi adayi reddedildi.",
    logVoiceConnectionFailed: "Ses baglantisi baslatilamadi."
  }[key] || key;
  return Object.entries(replacements).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, value), text);
}

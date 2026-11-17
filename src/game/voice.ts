import type { MicMode, RemotePlayer, VoicePeerState, VoiceSignalPayload } from '../types';

export interface VoiceSnapshot {
  micMode: MicMode;
  pttHeld: boolean;
  transmitting: boolean;
  speaking: boolean;
  micLevel: number;
  selfMonitor: boolean;
  masterVolume: number;
  error: string | null;
  peers: VoicePeerState[];
}

interface PeerEntry {
  info: VoicePeerState;
  pc: RTCPeerConnection | null;
  makingOffer: boolean;
  ignoreOffer: boolean;
  remoteStream: MediaStream | null;
  audioEl: HTMLAudioElement | null;
  nextPlayTime: number;
  gainNode: GainNode | null;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function float32ToBase64Int16(input: Float32Array, srcRate: number, dstRate = 16000): string {
  const ratio = srcRate / dstRate;
  const outLen = Math.max(1, Math.floor(input.length / ratio));
  const int16 = new Int16Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const idx = Math.min(input.length - 1, Math.floor(i * ratio));
    const clamped = Math.max(-1, Math.min(1, input[idx]));
    int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let bin = '';
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64Int16ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer, 0, Math.floor(bytes.byteLength / 2));
  const out = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    out[i] = int16[i] / 0x8000;
  }
  return out;
}

export class VoiceChatManager {
  private micMode: MicMode = 'off';
  private pttHeld = false;
  private selfMonitor = false;
  private masterVolume = 1;
  private error: string | null = null;
  private speaking = false;
  private lastVoiceMs = 0;
  private micLevel = 0;

  private localPlayerId = '';
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private analyserBuf: Float32Array<ArrayBuffer> | null = null;
  private monitorGain: GainNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private silentSink: GainNode | null = null;

  private meterTimer: number | null = null;
  private lastSentVoiceState: { micActive: boolean; speaking: boolean } = {
    micActive: false,
    speaking: false,
  };

  private peers = new Map<string, PeerEntry>();
  private onUpdate: (snapshot: VoiceSnapshot) => void;
  private onSendState: (micActive: boolean, speaking: boolean) => void;
  private onSendSignal: (to: string, signal: VoiceSignalPayload) => void;
  private onSendAudio: (pcm: string, sampleRate: number) => void;

  constructor(opts: {
    onUpdate: (snapshot: VoiceSnapshot) => void;
    onSendState: (micActive: boolean, speaking: boolean) => void;
    onSendSignal: (to: string, signal: VoiceSignalPayload) => void;
    onSendAudio: (pcm: string, sampleRate: number) => void;
  }) {
    this.onUpdate = opts.onUpdate;
    this.onSendState = opts.onSendState;
    this.onSendSignal = opts.onSendSignal;
    this.onSendAudio = opts.onSendAudio;
  }

  public setLocalPlayerId(id: string): void {
    this.localPlayerId = id;
  }

  public getSnapshot(): VoiceSnapshot {
    return {
      micMode: this.micMode,
      pttHeld: this.pttHeld,
      transmitting: this.isTransmitting(),
      speaking: this.speaking,
      micLevel: this.micLevel,
      selfMonitor: this.selfMonitor,
      masterVolume: this.masterVolume,
      error: this.error,
      peers: Array.from(this.peers.values()).map((p) => ({ ...p.info })),
    };
  }

  private emit(): void {
    this.onUpdate(this.getSnapshot());
  }

  public isTransmitting(): boolean {
    if (!this.stream || this.micMode === 'off') return false;
    if (this.micMode === 'open') return true;
    return this.pttHeld;
  }

  private ensurePlaybackContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.audioCtx = new Ctx();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public async setMicMode(mode: MicMode): Promise<boolean> {
    this.error = null;
    if (mode === 'off') {
      this.disableMic();
      return true;
    }

    if (!this.stream) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.error = 'Microphone API unavailable in this browser context.';
        this.emit();
        return false;
      }
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Microphone permission denied';
        this.error = msg.includes('Permission') || msg.includes('NotAllowed')
          ? 'Microphone access denied. Allow mic permission in your browser bar.'
          : msg;
        this.micMode = 'off';
        this.emit();
        return false;
      }

      this.setupAudioGraph();
      this.attachLocalTracksToAllPeers();
    }

    this.micMode = mode;
    this.updateTrackMuteState();
    this.syncVoiceStateIfChanged();
    this.emit();
    return true;
  }

  public disableMic(): void {
    this.micMode = 'off';
    this.pttHeld = false;
    this.speaking = false;
    this.micLevel = 0;

    if (this.meterTimer !== null) {
      window.clearInterval(this.meterTimer);
      this.meterTimer = null;
    }

    try {
      this.scriptNode?.disconnect();
      this.sourceNode?.disconnect();
      this.analyser?.disconnect();
      this.monitorGain?.disconnect();
      this.silentSink?.disconnect();
    } catch {
      // ignore disconnect errors
    }
    this.scriptNode = null;
    this.sourceNode = null;
    this.analyser = null;
    this.analyserBuf = null;
    this.monitorGain = null;
    this.silentSink = null;

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
    }

    for (const peer of this.peers.values()) {
      if (peer.pc) {
        for (const sender of peer.pc.getSenders()) {
          try {
            peer.pc.removeTrack(sender);
          } catch {
            // ignore
          }
        }
      }
    }

    this.syncVoiceStateIfChanged();
    this.emit();
  }

  public setPushToTalkHeld(held: boolean): void {
    if (this.pttHeld === held) return;
    this.pttHeld = held;
    this.updateTrackMuteState();
    this.syncVoiceStateIfChanged();
    this.emit();
  }

  public setSelfMonitor(enabled: boolean): void {
    this.selfMonitor = enabled;
    if (this.monitorGain && this.audioCtx) {
      this.monitorGain.gain.setTargetAtTime(enabled ? 0.75 : 0, this.audioCtx.currentTime, 0.02);
    }
    this.emit();
  }

  public setMasterVolume(vol: number): void {
    this.masterVolume = Math.max(0, Math.min(1.5, vol));
    for (const peer of this.peers.values()) {
      this.applyPeerVolume(peer);
    }
    this.emit();
  }

  public setPeerMuted(playerId: string, muted: boolean): void {
    const peer = this.peers.get(playerId);
    if (!peer) return;
    peer.info.muted = muted;
    this.applyPeerVolume(peer);
    this.emit();
  }

  public setPeerVolume(playerId: string, volume: number): void {
    const peer = this.peers.get(playerId);
    if (!peer) return;
    peer.info.volume = Math.max(0, Math.min(1.5, volume));
    this.applyPeerVolume(peer);
    this.emit();
  }

  private applyPeerVolume(peer: PeerEntry): void {
    const effective = peer.info.muted ? 0 : Math.min(1, peer.info.volume * this.masterVolume);
    if (peer.audioEl) {
      peer.audioEl.volume = effective;
      peer.audioEl.muted = peer.info.muted;
    }
    if (peer.gainNode && this.audioCtx) {
      peer.gainNode.gain.setTargetAtTime(effective, this.audioCtx.currentTime, 0.02);
    }
  }

  private updateTrackMuteState(): void {
    if (!this.stream) return;
    const enabled = this.isTransmitting();
    for (const track of this.stream.getAudioTracks()) {
      track.enabled = enabled;
    }
  }

  private setupAudioGraph(): void {
    if (!this.stream) return;
    const ctx = this.ensurePlaybackContext();
    if (!ctx) return;

    this.sourceNode = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyserBuf = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;

    this.monitorGain = ctx.createGain();
    this.monitorGain.gain.value = this.selfMonitor ? 0.75 : 0;

    // WebSocket PCM fallback capture (only broadcasts when speaking AND a peer lacks WebRTC)
    this.scriptNode = ctx.createScriptProcessor(2048, 1, 1);
    this.silentSink = ctx.createGain();
    this.silentSink.gain.value = 0;

    this.sourceNode.connect(this.analyser);
    this.sourceNode.connect(this.monitorGain);
    this.monitorGain.connect(ctx.destination);

    this.sourceNode.connect(this.scriptNode);
    this.scriptNode.connect(this.silentSink);
    this.silentSink.connect(ctx.destination);

    this.scriptNode.onaudioprocess = (ev) => {
      if (!this.isTransmitting() || this.peers.size === 0) return;
      const needsRelay = Array.from(this.peers.values()).some((p) => !p.info.webrtcConnected);
      if (!needsRelay) return;

      const input = ev.inputBuffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < input.length; i += 4) {
        const a = Math.abs(input[i]);
        if (a > peak) peak = a;
      }
      if (peak < 0.012 && !this.speaking) return;
      const b64 = float32ToBase64Int16(input, ctx.sampleRate, 16000);
      this.onSendAudio(b64, 16000);
    };

    if (this.meterTimer !== null) {
      window.clearInterval(this.meterTimer);
    }
    this.meterTimer = window.setInterval(() => {
      if (!this.analyser || !this.analyserBuf) return;
      if (!this.isTransmitting()) {
        if (this.micLevel !== 0 || this.speaking) {
          this.micLevel = 0;
          this.speaking = false;
          this.syncVoiceStateIfChanged();
          this.emit();
        }
        return;
      }

      this.analyser.getFloatTimeDomainData(this.analyserBuf);
      let sum = 0;
      for (let i = 0; i < this.analyserBuf.length; i++) {
        const s = this.analyserBuf[i];
        sum += s * s;
      }
      const rms = Math.sqrt(sum / this.analyserBuf.length);
      const level = Math.min(1, rms * 5.2);
      const now = performance.now();
      if (rms > 0.016) {
        this.lastVoiceMs = now;
      }
      const nextSpeaking = now - this.lastVoiceMs < 320;
      const changed =
        Math.abs(level - this.micLevel) > 0.04 || nextSpeaking !== this.speaking;
      this.micLevel = level;
      this.speaking = nextSpeaking;
      if (changed) {
        this.syncVoiceStateIfChanged();
        this.emit();
      }
    }, 80);
  }

  private syncVoiceStateIfChanged(): void {
    const micActive = this.isTransmitting();
    const speaking = micActive && this.speaking;
    if (
      this.lastSentVoiceState.micActive !== micActive ||
      this.lastSentVoiceState.speaking !== speaking
    ) {
      this.lastSentVoiceState = { micActive, speaking };
      this.onSendState(micActive, speaking);
    }
  }

  public syncPeers(remotePlayers: RemotePlayer[]): void {
    const activeIds = new Set(remotePlayers.map((p) => p.id));
    for (const [id, entry] of this.peers.entries()) {
      if (!activeIds.has(id)) {
        this.cleanupPeer(entry);
        this.peers.delete(id);
      }
    }
    for (const rp of remotePlayers) {
      if (rp.id === this.localPlayerId) continue;
      let entry = this.peers.get(rp.id);
      if (!entry) {
        entry = {
          info: {
            id: rp.id,
            name: rp.name,
            color: rp.color,
            micActive: Boolean(rp.micActive),
            speaking: Boolean(rp.speaking),
            webrtcConnected: false,
            muted: false,
            volume: 1,
          },
          pc: null,
          makingOffer: false,
          ignoreOffer: false,
          remoteStream: null,
          audioEl: null,
          nextPlayTime: 0,
          gainNode: null,
        };
        this.peers.set(rp.id, entry);
        if (typeof RTCPeerConnection !== 'undefined') {
          this.initPeerConnection(entry);
        }
      } else {
        entry.info.name = rp.name;
        entry.info.color = rp.color;
        if (typeof rp.micActive === 'boolean') entry.info.micActive = rp.micActive;
        if (typeof rp.speaking === 'boolean') entry.info.speaking = rp.speaking;
      }
    }
    this.emit();
  }

  public updatePeerVoiceState(playerId: string, micActive: boolean, speaking: boolean): void {
    const entry = this.peers.get(playerId);
    if (!entry) return;
    entry.info.micActive = micActive;
    entry.info.speaking = speaking && micActive;
    this.emit();
  }

  private attachLocalTracksToAllPeers(): void {
    if (!this.stream) return;
    for (const entry of this.peers.values()) {
      if (!entry.pc) continue;
      const existingKinds = new Set(entry.pc.getSenders().map((s) => s.track?.kind));
      for (const track of this.stream.getAudioTracks()) {
        if (!existingKinds.has(track.kind)) {
          entry.pc.addTrack(track, this.stream);
        }
      }
    }
  }

  private initPeerConnection(entry: PeerEntry): void {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    entry.pc = pc;

    // Receive remote audio even if local mic is off
    pc.addTransceiver('audio', { direction: 'sendrecv' });
    if (this.stream) {
      for (const track of this.stream.getAudioTracks()) {
        pc.addTrack(track, this.stream);
      }
    }

    pc.onnegotiationneeded = async () => {
      try {
        entry.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.onSendSignal(entry.info.id, {
            kind: pc.localDescription.type === 'answer' ? 'answer' : 'offer',
            sdp: pc.localDescription,
          });
        }
      } catch {
        // ignore negotiation collision
      } finally {
        entry.makingOffer = false;
      }
    };

    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.onSendSignal(entry.info.id, {
          kind: 'ice',
          candidate: candidate.toJSON(),
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const connected = pc.connectionState === 'connected';
      if (entry.info.webrtcConnected !== connected) {
        entry.info.webrtcConnected = connected;
        this.emit();
      }
    };

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] || new MediaStream([ev.track]);
      entry.remoteStream = stream;
      if (!entry.audioEl) {
        const audio = new Audio();
        audio.autoplay = true;
        audio.setAttribute('playsinline', 'true');
        entry.audioEl = audio;
      }
      entry.audioEl.srcObject = stream;
      this.applyPeerVolume(entry);
      void entry.audioEl.play().catch(() => {});
    };
  }

  public async handleSignal(fromId: string, signal: VoiceSignalPayload): Promise<void> {
    const entry = this.peers.get(fromId);
    if (!entry) return;
    if (!entry.pc && typeof RTCPeerConnection !== 'undefined') {
      this.initPeerConnection(entry);
    }
    const pc = entry.pc;
    if (!pc) return;

    const polite = this.localPlayerId < fromId;

    try {
      if ((signal.kind === 'offer' || signal.kind === 'answer') && signal.sdp) {
        const offerCollision =
          signal.sdp.type === 'offer' &&
          (entry.makingOffer || pc.signalingState !== 'stable');
        entry.ignoreOffer = !polite && offerCollision;
        if (entry.ignoreOffer) return;

        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (signal.sdp.type === 'offer') {
          await pc.setLocalDescription();
          if (pc.localDescription) {
            this.onSendSignal(fromId, {
              kind: 'answer',
              sdp: pc.localDescription,
            });
          }
        }
      } else if (signal.kind === 'ice' && signal.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch {
          if (!entry.ignoreOffer) {
            // ignore transient candidate errors
          }
        }
      }
    } catch {
      // ignore signal negotiation edge errors
    }
  }

  public handleIncomingAudio(fromId: string, pcmBase64: string, sampleRate: number): void {
    const entry = this.peers.get(fromId);
    if (!entry || entry.info.muted || entry.info.webrtcConnected) return;

    const ctx = this.ensurePlaybackContext();
    if (!ctx) return;

    try {
      const samples = base64Int16ToFloat32(pcmBase64);
      if (samples.length === 0) return;

      if (!entry.gainNode) {
        entry.gainNode = ctx.createGain();
        entry.gainNode.connect(ctx.destination);
        this.applyPeerVolume(entry);
      }

      const buf = ctx.createBuffer(1, samples.length, sampleRate);
      buf.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(entry.gainNode);

      const now = ctx.currentTime;
      if (entry.nextPlayTime < now || entry.nextPlayTime > now + 0.5) {
        entry.nextPlayTime = now + 0.04;
      }
      src.start(entry.nextPlayTime);
      entry.nextPlayTime += buf.duration;
    } catch {
      // ignore decode glitches
    }
  }

  private cleanupPeer(entry: PeerEntry): void {
    try {
      entry.pc?.close();
    } catch {
      // ignore
    }
    if (entry.audioEl) {
      entry.audioEl.pause();
      entry.audioEl.srcObject = null;
      entry.audioEl = null;
    }
    try {
      entry.gainNode?.disconnect();
    } catch {
      // ignore
    }
  }

  public clearAllPeers(): void {
    for (const entry of this.peers.values()) {
      this.cleanupPeer(entry);
    }
    this.peers.clear();
    this.emit();
  }

  public dispose(): void {
    this.disableMic();
    this.clearAllPeers();
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function createSpeechDictation(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

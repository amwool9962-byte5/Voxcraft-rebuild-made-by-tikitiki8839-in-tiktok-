import { useEffect, useRef, useState } from 'react';
import {
  Headphones,
  MessageSquare,
  Mic,
  MicOff,
  Radio,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { ChatMessage, MicMode } from '../types';
import { createSpeechDictation, type SpeechRecognitionLike, type VoiceSnapshot } from '../game/voice';

interface ChatOverlayProps {
  mode: 'solo' | 'multiplayer';
  playerName: string;
  playerColor: string;
  messages: ChatMessage[];
  isOpen: boolean;
  voice: VoiceSnapshot;
  onClose: () => void;
  onSend: (text: string) => void;
  onSetMicMode: (mode: MicMode) => void;
  onPushToTalkHold: (held: boolean) => void;
  onSetSelfMonitor: (enabled: boolean) => void;
  onSetMasterVolume: (vol: number) => void;
  onSetPeerMuted: (peerId: string, muted: boolean) => void;
  onSetPeerVolume: (peerId: string, vol: number) => void;
}

export function ChatOverlay({
  mode,
  playerName,
  playerColor,
  messages,
  isOpen,
  voice,
  onClose,
  onSend,
  onSetMicMode,
  onPushToTalkHold,
  onSetSelfMonitor,
  onSetMasterVolume,
  onSetPeerMuted,
  onSetPeerVolume,
}: ChatOverlayProps) {
  const [text, setText] = useState('');
  const [dictating, setDictating] = useState(false);
  const [dictationNotice, setDictationNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 40);
    } else if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setDictating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const toggleDictation = () => {
    setDictationNotice(null);
    if (dictating && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setDictating(false);
      return;
    }

    const rec = createSpeechDictation();
    if (!rec) {
      setDictationNotice('Voice-to-text dictation is not supported in this browser.');
      return;
    }

    recognitionRef.current = rec;
    const baseText = text.trim() ? `${text.trim()} ` : '';
    rec.onresult = (ev) => {
      let combined = '';
      for (let i = 0; i < ev.results.length; i++) {
        combined += ev.results[i][0]?.transcript ?? '';
      }
      setText(`${baseText}${combined}`.slice(0, 240));
    };
    rec.onerror = (ev) => {
      setDictating(false);
      setDictationNotice(
        ev.error === 'not-allowed'
          ? 'Microphone permission denied for dictation.'
          : `Dictation stopped (${ev.error}).`
      );
    };
    rec.onend = () => {
      setDictating(false);
    };

    try {
      rec.start();
      setDictating(true);
    } catch {
      setDictating(false);
      setDictationNotice('Could not start voice dictation.');
    }
  };

  const recent = messages.slice(-5);
  const activeSpeakers = [
    ...(voice.transmitting && voice.speaking
      ? [{ id: '__local__', name: `${playerName} (You)`, color: playerColor }]
      : []),
    ...voice.peers
      .filter((p) => p.speaking && p.micActive)
      .map((p) => ({ id: p.id, name: p.name, color: p.color })),
  ];

  const levelPct = Math.round(Math.min(1, voice.micLevel) * 100);

  return (
    <>
      {!isOpen && (activeSpeakers.length > 0 || recent.length > 0 || voice.micMode !== 'off') && (
        <div className="pointer-events-none fixed bottom-28 left-3 z-20 flex max-w-xs flex-col gap-1.5 sm:left-4">
          {(activeSpeakers.length > 0 || voice.micMode !== 'off') && (
            <div className="flex flex-wrap items-center gap-1.5">
              {voice.micMode !== 'off' && activeSpeakers.every((s) => s.id !== '__local__') && (
                <div
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-bold shadow ${
                    voice.transmitting
                      ? 'border-emerald-400/60 bg-emerald-950/90 text-emerald-200'
                      : 'border-sky-400/50 bg-slate-950/88 text-sky-200'
                  }`}
                >
                  <Mic className="h-3 w-3" />
                  <span>
                    {voice.micMode === 'ptt'
                      ? voice.pttHeld
                        ? 'Talking [V]'
                        : 'PTT Ready · Hold [V]'
                      : 'Mic Open'}
                  </span>
                </div>
              )}
              {activeSpeakers.map((spk) => (
                <div
                  key={spk.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/75 bg-emerald-950/92 px-2 py-0.5 text-[11px] font-bold text-emerald-100 shadow-lg"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <Mic className="h-3 w-3 text-emerald-300" />
                  <span style={{ color: spk.color }}>{spk.name}</span>
                  <span className="text-[9px] text-emerald-300">Speaking</span>
                </div>
              ))}
            </div>
          )}

          {recent.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg border px-2.5 py-1 text-xs shadow ${
                m.isSystem
                  ? 'border-cyan-500/35 bg-slate-950/90 text-cyan-200'
                  : 'border-slate-800 bg-slate-950/85 text-slate-200'
              }`}
            >
              {!m.isSystem && (
                <span className="font-bold" style={{ color: m.color }}>
                  {m.senderName}:{' '}
                </span>
              )}
              <span>{m.text}</span>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4">
          <div className="flex h-[540px] max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                <span>{mode === 'multiplayer' ? 'Room Chat & Voice Comms' : 'World Chat & Mic Studio'}</span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${
                    voice.transmitting
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                      : voice.micMode === 'ptt'
                      ? 'border-sky-400/60 bg-sky-500/20 text-sky-200'
                      : 'border-slate-700 bg-slate-800 text-slate-400'
                  }`}
                >
                  {voice.micMode === 'off'
                    ? 'Mic Off'
                    : voice.micMode === 'open'
                    ? 'Open Mic'
                    : voice.pttHeld
                    ? 'PTT Live'
                    : 'PTT [V]'}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Chat"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Microphone & Voice Controls */}
            <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSetMicMode('off')}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                      voice.micMode === 'off'
                        ? 'border-rose-400/60 bg-rose-500/20 text-rose-200'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <MicOff className="h-3.5 w-3.5" /> Off
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetMicMode('open')}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                      voice.micMode === 'open'
                        ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100 shadow'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400/60'
                    }`}
                  >
                    <Mic className="h-3.5 w-3.5" /> Open Mic
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetMicMode('ptt')}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                      voice.micMode === 'ptt'
                        ? 'border-sky-400 bg-sky-500/25 text-sky-100 shadow'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-400/60'
                    }`}
                    title="Hold V while playing to transmit"
                  >
                    <Radio className="h-3.5 w-3.5" /> Push-to-Talk (V)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onSetSelfMonitor(!voice.selfMonitor)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition cursor-pointer ${
                    voice.selfMonitor
                      ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500'
                  }`}
                  title="Play your own microphone back through speakers to test it"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  {voice.selfMonitor ? 'Testing Mic' : 'Test Mic'}
                </button>
              </div>

              {/* Live Mic Level & PTT Hold Button + Master Volume */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-1 min-w-[160px] items-center gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      voice.speaking && voice.transmitting
                        ? 'text-emerald-300'
                        : voice.transmitting
                        ? 'text-cyan-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {voice.speaking && voice.transmitting ? 'Speaking' : 'Input'}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full border border-slate-800 bg-slate-900">
                    <div
                      className={`h-full transition-all duration-75 ${
                        levelPct > 75
                          ? 'bg-amber-400'
                          : voice.speaking
                          ? 'bg-emerald-400'
                          : 'bg-cyan-400'
                      }`}
                      style={{ width: `${levelPct}%` }}
                    />
                  </div>
                </div>

                {voice.micMode === 'ptt' && (
                  <button
                    type="button"
                    onMouseDown={() => onPushToTalkHold(true)}
                    onMouseUp={() => onPushToTalkHold(false)}
                    onMouseLeave={() => onPushToTalkHold(false)}
                    onTouchStart={() => onPushToTalkHold(true)}
                    onTouchEnd={() => onPushToTalkHold(false)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-extrabold transition cursor-pointer select-none ${
                      voice.pttHeld
                        ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                        : 'border-sky-400/60 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
                    }`}
                  >
                    {voice.pttHeld ? 'Transmitting...' : 'Hold to Talk'}
                  </button>
                )}

                <label className="flex items-center gap-1.5 text-[10px] text-slate-300">
                  <Volume2 className="h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={150}
                    value={Math.round(voice.masterVolume * 100)}
                    onChange={(e) => onSetMasterVolume(Number(e.target.value) / 100)}
                    className="w-16 accent-cyan-400 cursor-pointer"
                    title="Master Voice Volume"
                  />
                  <span className="w-7 font-mono tabular-nums text-slate-400">
                    {Math.round(voice.masterVolume * 100)}%
                  </span>
                </label>
              </div>

              {voice.error && (
                <div className="rounded-lg border border-rose-500/50 bg-rose-950/60 px-2.5 py-1.5 text-[11px] text-rose-200">
                  {voice.error}
                </div>
              )}

              {/* Voice Room Peers */}
              {mode === 'multiplayer' && (
                <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Voice Channel ({voice.peers.length + 1} Explorers)</span>
                    <span className="font-normal text-slate-500">WebRTC + WS Audio Relay</span>
                  </div>
                  {voice.peers.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Waiting for other explorers in this room. Enable Open Mic or Push-to-Talk [V] anytime!
                    </p>
                  ) : (
                    <div className="max-h-24 space-y-1 overflow-y-auto pr-1">
                      {voice.peers.map((peer) => (
                        <div
                          key={peer.id}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1 text-xs ${
                            peer.speaking && peer.micActive
                              ? 'border-emerald-400/60 bg-emerald-950/40'
                              : 'border-slate-800 bg-slate-900/90'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                peer.speaking && peer.micActive
                                  ? 'bg-emerald-400 animate-pulse'
                                  : peer.micActive
                                  ? 'bg-sky-400'
                                  : 'bg-slate-600'
                              }`}
                            />
                            <span className="font-bold truncate" style={{ color: peer.color }}>
                              {peer.name}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] font-mono text-slate-400">
                              {peer.webrtcConnected ? 'P2P' : 'Relay'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              type="range"
                              min={0}
                              max={150}
                              value={Math.round(peer.volume * 100)}
                              onChange={(e) => onSetPeerVolume(peer.id, Number(e.target.value) / 100)}
                              className="w-14 accent-emerald-400 cursor-pointer"
                              title={`Volume for ${peer.name}`}
                            />
                            <button
                              type="button"
                              onClick={() => onSetPeerMuted(peer.id, !peer.muted)}
                              className={`rounded p-1 cursor-pointer ${
                                peer.muted
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-slate-800 text-slate-300 hover:text-white'
                              }`}
                              title={peer.muted ? `Unmute ${peer.name}` : `Mute ${peer.name}`}
                            >
                              {peer.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chat History */}
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 space-y-1.5">
                  <p>
                    {mode === 'multiplayer'
                      ? 'No messages yet. Say hello or turn on your microphone above to talk live!'
                      : 'Solo World Comms ready. Test your mic above, dictate messages, or run slash commands!'}
                  </p>
                  <p className="font-mono text-[10px] text-cyan-300/80">
                    Commands: /help · /heal · /time day · /time night · /tnt · /birds · /fly
                  </p>
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      m.isSystem
                        ? 'border-cyan-500/35 bg-cyan-950/35 text-cyan-200'
                        : 'border-slate-800 bg-slate-950/90 text-slate-200'
                    }`}
                  >
                    {m.isSystem ? (
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Sparkles className="h-3 w-3 text-cyan-400 shrink-0" />
                        <span className="break-words">{m.text}</span>
                      </span>
                    ) : (
                      <>
                        <span className="font-bold" style={{ color: m.color }}>
                          {m.senderName}:{' '}
                        </span>
                        <span className="break-words">{m.text}</span>
                      </>
                    )}
                  </div>
                ))
              )}
              <div ref={listEndRef} />
            </div>

            {dictationNotice && (
              <div className="border-t border-slate-800 bg-amber-950/50 px-3 py-1.5 text-[11px] text-amber-200">
                {dictationNotice}
              </div>
            )}

            {/* Message Input & Dictation */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = text.trim();
                if (!trimmed) return;
                onSend(trimmed);
                setText('');
              }}
              className="flex gap-2 border-t border-slate-800 bg-slate-950 p-3"
            >
              <button
                type="button"
                onClick={toggleDictation}
                title="Voice-to-Text: Speak to fill chat message"
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-bold transition cursor-pointer ${
                  dictating
                    ? 'border-rose-400 bg-rose-500/25 text-rose-200 animate-pulse'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400 hover:text-cyan-200'
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{dictating ? 'Listening' : 'Dictate'}</span>
              </button>
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  mode === 'multiplayer'
                    ? 'Type message or /help command...'
                    : 'Type note or /help, /heal, /birds, /tnt...'
                }
                maxLength={240}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-cyan-300 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

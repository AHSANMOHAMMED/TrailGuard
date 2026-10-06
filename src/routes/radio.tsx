import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Mic, Play, RadioTower, Square } from "lucide-react";
import {
  Body,
  BtnPrimary,
  Card,
  HintCard,
  OfflineBanner,
  Phone,
  Pill,
  RadioRow,
  Row,
  ScreenHeader,
  Tile,
} from "@/components/field";
import { ConnectivityToggle } from "@/components/connectivity-toggle";
import { Guard } from "@/components/auth-gate";
import { useAuth } from "@/lib/auth-store";
import { RADIO_CHANNELS, useField, type RadioChannelId } from "@/lib/store";
import type { RadioMessage } from "@/lib/types";
import { fmtClock } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/radio")({
  component: () => (
    <Guard area="radio">
      <RadioPage />
    </Guard>
  ),
});

/**
 * Field Radio — push-to-talk voice and text over the park VHF channel plan.
 *
 * Transmissions follow the offline-first contract: a call made under
 * coverage is acknowledged immediately, one made in a dead zone queues on
 * the device (PENDING) and forwards with the next synchronisation. Voice
 * notes are captured with the device microphone; clips live for the
 * session on this device.
 */

/** Object URLs of voice clips captured this session (too large to persist). */
const voiceClips = new Map<string, string>();

function RadioPage() {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const { online, radioMessages, transmitRadio, synchronize } = useField();

  const [channel, setChannel] = useState<RadioChannelId>("OPS-1");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recS, setRecS] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const mediaRef = useRef<{ rec: MediaRecorder; stream: MediaStream } | null>(null);
  const recSRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const channelMeta = RADIO_CHANNELS.find((c) => c.id === channel) ?? RADIO_CHANNELS[0];
  const log = radioMessages.filter((m) => m.channel === channel);

  // Live transmission timer while the talk key is held.
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      recSRef.current += 1;
      setRecS(recSRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [recording]);

  // Coverage restored: forward queued transmissions, exactly like incidents.
  useEffect(() => {
    if (!online || !radioMessages.some((m) => m.syncState === "PENDING")) return;
    const t = setTimeout(() => void synchronize().catch(() => undefined), 1200);
    return () => clearTimeout(t);
  }, [online, radioMessages, synchronize]);

  useEffect(() => () => mediaRef.current?.stream.getTracks().forEach((tr) => tr.stop()), []);

  function startTx() {
    if (recording || typeof MediaRecorder === "undefined") {
      if (typeof MediaRecorder === "undefined") {
        toast.error("Voice is not supported on this device — send a text callout.");
      }
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const rec = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        rec.onstop = () => {
          stream.getTracks().forEach((tr) => tr.stop());
          const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
          const msg = transmitRadio({
            channel,
            fromRole: session!.role as RadioMessage["fromRole"],
            fromTitle: session!.title,
            kind: "voice",
            durationS: Math.max(1, recSRef.current),
          });
          voiceClips.set(msg.messageId, URL.createObjectURL(blob));
          setRecording(false);
          if (!online) {
            toast.message("Queued on device — forwards when coverage returns");
          }
        };
        recSRef.current = 0;
        setRecS(0);
        mediaRef.current = { rec, stream };
        rec.start();
        setRecording(true);
      })
      .catch(() => {
        toast.error("Microphone unavailable — send a text callout instead.");
      });
  }

  function stopTx() {
    mediaRef.current?.rec.stop();
    mediaRef.current = null;
  }

  function sendText() {
    const body = text.trim();
    if (!body || !session) return;
    transmitRadio({
      channel,
      fromRole: session.role as RadioMessage["fromRole"],
      fromTitle: session.title,
      kind: "text",
      text: body.slice(0, 120),
    });
    setText("");
  }

  function playClip(id: string) {
    const url = voiceClips.get(id);
    if (!url) return;
    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlaying(id);
    audio.onended = () => setPlaying(null);
    void audio.play().catch(() => setPlaying(null));
  }

  return (
    <Phone>
      <ScreenHeader title="Field Radio" onBack="home">
        <ConnectivityToggle />
      </ScreenHeader>
      <Body>
        {!online ? <OfflineBanner text="Radio queueing locally" /> : null}
        <div>
          <h2 className="text-[18px] font-bold tracking-tight">Push to talk</h2>
          <p className="text-[12.5px] text-muted">
            VHF channel plan · works in dead zones, forwards on coverage.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {RADIO_CHANNELS.map((c) => (
            <RadioRow
              key={c.id}
              label={`${c.name} · ${c.freq}`}
              sub={c.desc}
              icon={<RadioTower className="size-4" strokeWidth={2} />}
              selected={channel === c.id}
              onSelect={() => setChannel(c.id)}
            />
          ))}
        </div>

        {/* Talk key */}
        <div className="flex flex-col items-center gap-1.5 py-1">
          <button
            type="button"
            aria-label={recording ? "Release to transmit" : "Hold to talk"}
            onPointerDown={startTx}
            onPointerUp={stopTx}
            onPointerLeave={() => recording && stopTx()}
            className={
              recording
                ? "flex size-20 items-center justify-center rounded-full bg-danger text-white shadow-lg ring-4 ring-danger/30 transition-transform scale-105"
                : "flex size-20 items-center justify-center rounded-full bg-accent text-accent-fg shadow-md transition-colors hover:bg-[#174935]"
            }
          >
            {recording ? (
              <Square className="size-7" fill="currentColor" strokeWidth={0} />
            ) : (
              <Mic className="size-7" strokeWidth={2} />
            )}
          </button>
          <p className="text-[11.5px] font-semibold text-muted">
            {recording ? `TRANSMITTING · ${recS}s — release to send` : "Hold to talk"}
          </p>
        </div>

        {/* Quick text callout */}
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 120))}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
            placeholder="Text callout…"
            aria-label="Text callout"
            className="w-full bg-transparent text-[14px] outline-none"
          />
          <button
            type="button"
            onClick={sendText}
            disabled={!text.trim()}
            className="rounded-lg bg-accent px-3 py-1.5 text-[12px] font-bold text-accent-fg disabled:opacity-40"
          >
            Send
          </button>
        </div>

        {/* Transmission log */}
        <div>
          <p className="mb-1.5 text-[12px] font-semibold text-muted">
            {channelMeta.name} log · {channelMeta.freq}
          </p>
          {log.length === 0 ? (
            <Card>
              <p className="text-[13px] text-muted">No transmissions on this channel yet.</p>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {log.map((m) => (
                <Card key={m.messageId} className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-elevated text-accent">
                    {m.kind === "voice" ? (
                      <Mic className="size-4" strokeWidth={2} />
                    ) : (
                      <MessageSquare className="size-4" strokeWidth={2} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13.5px] font-bold">{m.fromTitle}</span>
                      {m.syncState === "PENDING" ? (
                        <Pill tone="warn">Queued</Pill>
                      ) : (
                        <Pill tone="ok">Sent</Pill>
                      )}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {m.kind === "voice"
                        ? `Voice · ${m.durationS}s · ${fmtClock(m.transmittedAt)}`
                        : `${m.text} · ${fmtClock(m.transmittedAt)}`}
                    </span>
                  </span>
                  {m.kind === "voice" ? (
                    <button
                      type="button"
                      aria-label="Play transmission"
                      disabled={!voiceClips.has(m.messageId) || playing === m.messageId}
                      onClick={() => playClip(m.messageId)}
                      title={
                        voiceClips.has(m.messageId)
                          ? "Play"
                          : "Clip kept for this session on the capturing device"
                      }
                      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent disabled:opacity-40"
                    >
                      <Play className="size-4" strokeWidth={2} />
                    </button>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </div>

        {!online ? (
          <HintCard>
            Queued transmissions forward to the channel automatically when coverage returns.
          </HintCard>
        ) : (
          <HintCard>Hold the talk key and speak; release to transmit on {channel}.</HintCard>
        )}

        <div className="flex gap-2">
          <Tile k="Channel" v={channel} />
          <Tile k="Queued" v={radioMessages.filter((m) => m.syncState === "PENDING").length} />
        </div>

        <Card>
          <Row k="Squelch" v="Open" strong />
          <Row k="Antenna" v="Internal · -96 dBm floor" strong />
        </Card>

        <div className="mt-auto pt-2">
          <BtnPrimary onClick={() => router.navigate({ to: "/" })}>Back to Ops Desk</BtnPrimary>
        </div>
      </Body>
    </Phone>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTURE, formatClock } from "@/lib/coach/rubric";

type Phase = "starting" | "ready" | "countdown" | "recording";

const MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function pickMimeType() {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export function Recorder({
  onDone,
  onClose,
  onUnavailable,
}: {
  onDone: (blob: Blob, seconds: number) => void;
  onClose: () => void;
  onUnavailable: (message: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [phase, setPhase] = useState<Phase>("starting");
  const [count, setCount] = useState(3);
  const [elapsed, setElapsed] = useState(0);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      stopTracks();
      setPhase("starting");
      try {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
          throw new Error("unsupported");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          // Automatic gain would flatten the dynamics we're trying to measure.
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        const denied = err instanceof DOMException && err.name === "NotAllowedError";
        onUnavailable(
          denied
            ? "Camera access is off. Allow it in Settings, or choose a video you already recorded."
            : "This browser can't record here. Choose a video from your camera roll instead."
        );
      }
    })();
    return () => {
      cancelled = true;
      stopTracks();
    };
  }, [facing, onUnavailable]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = window.setInterval(() => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(seconds);
      if (seconds >= CAPTURE.recordSeconds) stop();
    }, 100);
    return () => window.clearInterval(timer);
  }, [phase, stop]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      startRecording();
      return;
    }
    const timer = window.setTimeout(() => setCount((c) => c - 1), 800);
    return () => window.clearTimeout(timer);
    // startRecording reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 2_500_000,
    });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const seconds = (Date.now() - startedAtRef.current) / 1000;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "video/mp4" });
      void wakeLockRef.current?.release().catch(() => undefined);
      stopTracks();
      onDone(blob, Math.min(seconds, CAPTURE.recordSeconds));
    };
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();
    setElapsed(0);
    recorder.start(1000);
    setPhase("recording");
    const wakeLock = (navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    }).wakeLock;
    wakeLock
      ?.request("screen")
      .then((lock) => (wakeLockRef.current = lock))
      .catch(() => undefined);
  }

  const progress = Math.min(1, elapsed / CAPTURE.recordSeconds);
  const canStop = phase === "recording" && elapsed >= CAPTURE.minSeconds;
  const r = 38;
  const c = 2 * Math.PI * r;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <video
        ref={videoRef}
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: facing === "user" ? "scaleX(-1)" : undefined }}
      />

      {/* Framing guide */}
      <div className="pointer-events-none absolute inset-x-5 top-[calc(env(safe-area-inset-top)+4.5rem)] bottom-[calc(env(safe-area-inset-bottom)+10rem)] rounded-[28px] border-2 border-dashed border-white/55" />

      <div className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          type="button"
          onClick={() => {
            stop();
            stopTracks();
            onClose();
          }}
          disabled={phase === "recording"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md disabled:opacity-0"
          aria-label="Close camera"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <p className="rounded-full bg-black/40 px-3 py-1.5 text-[13px] font-medium backdrop-blur-md">
          {phase === "recording" ? "Recording" : "Head, shoulders, arms and hands in frame"}
        </p>
        <button
          type="button"
          onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}
          disabled={phase === "recording" || phase === "countdown"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/40 backdrop-blur-md disabled:opacity-0"
          aria-label="Flip camera"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 8h3l2-2h6l2 2h3v11H4z" strokeLinejoin="round" />
            <path d="M9.5 13.5a2.5 2.5 0 104.3-1.8M14.5 10v2h-2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {phase === "countdown" && count > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span key={count} className="font-display text-[120px] font-semibold drop-shadow-lg">
            {count}
          </span>
        </div>
      )}

      <div className="relative mt-auto flex flex-col items-center gap-3 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
        <p className="rounded-full bg-black/40 px-3 py-1 text-[15px] font-semibold tabular-nums backdrop-blur-md">
          {formatClock(elapsed)} / {formatClock(CAPTURE.recordSeconds)}
        </p>
        <button
          type="button"
          disabled={phase === "starting" || phase === "countdown" || (phase === "recording" && !canStop)}
          onClick={() => {
            if (phase === "ready") {
              setCount(3);
              setPhase("countdown");
            } else if (canStop) {
              stop();
            }
          }}
          className="relative flex h-[92px] w-[92px] items-center justify-center disabled:opacity-90"
          aria-label={phase === "recording" ? "Stop recording" : "Start recording"}
        >
          <svg width="92" height="92" className="absolute inset-0 -rotate-90">
            <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="6" />
            <circle
              cx="46"
              cy="46"
              r={r}
              fill="none"
              stroke="#fff"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress)}
            />
          </svg>
          <span
            className={`bg-[#e8574a] transition-all duration-200 ${
              phase === "recording" ? "h-8 w-8 rounded-lg" : "h-[64px] w-[64px] rounded-full"
            }`}
          />
        </button>
        <p className="h-5 text-[13px] text-white/80">
          {phase === "starting"
            ? "Starting camera…"
            : phase === "recording" && !canStop
              ? `Keep playing — at least ${CAPTURE.minSeconds} seconds`
              : phase === "recording"
                ? "Tap to finish, or it stops at 1:00"
                : phase === "ready"
                  ? "Tap to start. You'll get a 3-second countdown."
                  : ""}
        </p>
      </div>
    </div>
  );
}

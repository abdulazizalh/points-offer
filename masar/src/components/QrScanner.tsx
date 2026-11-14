"use client";
import { useEffect, useRef, useState } from "react";
import { Sheet } from "./ui";
import { useStore } from "@/lib/store";

/** Extracts a 6-character check-in code from a scanned QR payload. */
export function extractCode(raw: string): string | null {
  const m = raw.match(/[?&]code=([A-Za-z0-9]{6})/) ?? raw.trim().match(/^([A-Za-z0-9]{6})$/);
  return m ? m[1].toUpperCase() : null;
}

type Detector = { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };

export function QrScanner({ open, onClose, onCode, parse = extractCode, title }: { open: boolean; onClose: () => void; onCode: (code: string) => void; parse?: (raw: string) => string | null; title?: string }) {
  const { t } = useStore();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!BD || !navigator.mediaDevices?.getUserMedia) {
      setError(t("arrive.scanUnsupported"));
      return;
    }
    let stream: MediaStream | null = null;
    let stop = false;
    const detector = new BD({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s;
        if (!video.current) return;
        video.current.srcObject = s;
        await video.current.play();
        const loop = async () => {
          if (stop || !video.current) return;
          try {
            const found = await detector.detect(video.current);
            const code = found.map((f) => parse(f.rawValue)).find(Boolean);
            if (code) return onCode(code);
          } catch {}
          setTimeout(loop, 250);
        };
        loop();
      })
      .catch(() => setError(t("arrive.cameraDenied")));
    return () => {
      stop = true;
      stream?.getTracks().forEach((x) => x.stop());
    };
  }, [open, onCode, t, parse]);

  return (
    <Sheet open={open} onClose={onClose} title={title ?? t("arrive.scan")}>
      {error ? (
        <p className="rounded-2xl bg-bg p-4 text-[14px] text-muted">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-navy">
          <video ref={video} className="aspect-square w-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-10 rounded-3xl border-2 border-white/80" />
        </div>
      )}
    </Sheet>
  );
}

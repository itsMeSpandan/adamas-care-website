"use client";

/**
 * components/ui/DashboardBackgroundControl.tsx — admin-only background picker.
 *
 * Lives inside the member dashboard hero so an admin can change what every
 * member sees without leaving the page they are looking at. Nothing here renders
 * for non-admins, but the buttons are not the access control: the API behind
 * them is admin-only by itself.
 */

import { useRef, useState } from "react";
import { ImageUp, RotateCcw, Loader2 } from "lucide-react";
import {
  BACKGROUND_JPEG_QUALITY,
  BACKGROUND_MAX_EDGE,
  MAX_BACKGROUND_FIELD_LENGTH,
  checkPickedFile,
  resizeImageToDataUrlUnderCap,
} from "@/lib/image-field";

interface Props {
  /** Whether an admin-uploaded background is currently set. */
  custom: boolean;
  /** Version of the stored background, or null when the default is in use. */
  version: string | null;
  onChanged: (next: { custom: boolean; version: string | null }) => void;
}

export default function DashboardBackgroundControl({ custom, version, onChanged }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    const problem = checkPickedFile(file);
    if (problem) {
      setError(problem);
      setMessage(null);
      return;
    }

    setError(null);
    setBusy(true);
    setMessage("Resizing...");
    try {
      const image = await resizeImageToDataUrlUnderCap(file, {
        maxEdge: BACKGROUND_MAX_EDGE,
        quality: BACKGROUND_JPEG_QUALITY,
        maxLength: MAX_BACKGROUND_FIELD_LENGTH,
      });

      setMessage("Uploading...");
      const res = await fetch("/api/dashboard-background", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "Could not save that image.");
        setMessage(null);
        return;
      }

      onChanged({ custom: true, version: data.version ?? null });
      setMessage("Background updated for every member.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that image.");
      setMessage(null);
    } finally {
      setBusy(false);
    }
  };

  const useDefault = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard-background", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Could not reset the background.");
        return;
      }
      onChanged({ custom: false, version: null });
      setMessage("Using the default image again.");
    } catch {
      setError("Could not reset the background.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="absolute right-4 top-4 z-30 md:right-8 md:top-8">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex items-center gap-2 rounded-full border border-beige-300 bg-white/90 px-4 py-2 text-xs font-medium text-beige-700 shadow-sm backdrop-blur transition-colors hover:bg-white"
        aria-expanded={open}
        aria-label="Change dashboard background"
      >
        <ImageUp className="h-3.5 w-3.5" />
        Background
      </button>

      {open && (
        <div className="mt-2 w-72 rounded-card border border-beige-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <p className="text-sm font-medium text-beige-700">Dashboard background</p>
          <p className="mt-1 text-xs text-beige-500">
            Shows behind the greeting for every signed-in member.
            {custom ? " A custom image is in use." : " The default image is in use."}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex items-center gap-2 rounded-full bg-beige-600 px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />}
              {custom ? "Replace image" : "Upload image"}
            </button>

            {custom && (
              <button
                type="button"
                onClick={useDefault}
                disabled={busy}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-beige-600 transition-colors hover:bg-beige-50 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Use default
              </button>
            )}
          </div>

          {message && <p className="mt-2 text-xs text-beige-500">{message}</p>}
          {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

          <p className="mt-3 text-[11px] leading-relaxed text-beige-400">
            JPG, PNG, WebP or GIF · up to 5 MB · scaled to {BACKGROUND_MAX_EDGE} px and compressed
            to fit. {version ? `Version ${version}.` : ""}
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={pick}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}

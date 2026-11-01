/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  ImageUp,
  Trash2,
  ChevronUp,
  ChevronDown,
  Calendar,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  Crosshair,
  Loader2,
  X,
  Sparkles,
} from "lucide-react";
import {
  MAX_HERO_IMAGES,
  HERO_MAX_UPLOAD_BYTES,
  HERO_RECOMMENDED_WIDTH,
  HERO_RECOMMENDED_HEIGHT,
    type HeroImageStatus,
} from "@/lib/hero-images";

interface AdminHeroItem {
  id: string;
  alt: string;
  sortOrder: number;
  enabled: boolean;
  startDate: string | null;
  endDate: string | null;
  focalX: number;
  focalY: number;
  width: number;
  height: number;
  blurDataUrl: string;
  desktopUrl: string;
  mobileUrl: string;
  createdAt: string;
  updatedAt: string;
  status: HeroImageStatus;
}

export default function AdminImagesPage() {
  const [images, setImages] = useState<AdminHeroItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload queue / state
  const [uploadQueue, setUploadQueue] = useState<{
    file: File;
    alt: string;
    progress: number;
    error: string | null;
  }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit focal point modal / state
  const [editingImage, setEditingImage] = useState<AdminHeroItem | null>(null);
  const [tempFocalX, setTempFocalX] = useState<number>(50);
  const [tempFocalY, setTempFocalY] = useState<number>(20);
  const [savingFocal, setSavingFocal] = useState(false);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Fetch images
  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/hero-images");
      if (!res.ok) {
        throw new Error("Failed to load hero images");
      }
      const data = await res.json();
      setImages(data.images || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Handle files selected (via picker or drag-drop)
  const handleFilesChosen = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const remainingSlots = MAX_HERO_IMAGES - images.length;
    if (remainingSlots <= 0) {
      setError(`Cannot add more images. Hard limit of ${MAX_HERO_IMAGES} reached.`);
      return;
    }

    const files = Array.from(fileList);
    const validQueue: { file: File; alt: string; progress: number; error: string | null }[] = [];

    for (const file of files) {
      if (validQueue.length >= remainingSlots) {
        setError(`Only added ${remainingSlots} image(s) to avoid exceeding the ${MAX_HERO_IMAGES} limit.`);
        break;
      }

      // Check size before upload (avoids 6 MB Netlify function body limit)
      if (file.size > HERO_MAX_UPLOAD_BYTES) {
        setError(
          `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — maximum allowed upload size is 5 MB.`
        );
        continue;
      }

      // Derive default alt text from filename without extension
      const defaultAlt = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();

      validQueue.push({
        file,
        alt: defaultAlt.length >= 3 ? defaultAlt : "Adamas Care hero banner",
        progress: 0,
        error: null,
      });
    }

    if (validQueue.length > 0) {
      setUploadQueue((prev) => [...prev, ...validQueue]);
    }
  };

  // Perform uploads
  const startUpload = async () => {
    if (uploadQueue.length === 0 || uploading) return;
    setUploading(true);
    setError(null);

    for (let i = 0; i < uploadQueue.length; i++) {
      const item = uploadQueue[i];
      if (item.error) continue;

      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("alt", item.alt);

      try {
        setUploadQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, progress: 40 } : q))
        );

        const res = await fetch("/api/admin/hero-images", {
          method: "POST",
          body: formData,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        setUploadQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, progress: 100 } : q))
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload error";
        setUploadQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, error: msg } : q))
        );
      }
    }

    setUploading(false);
    await fetchImages();

    // Clear items that succeeded
    setTimeout(() => {
      setUploadQueue((prev) => prev.filter((item) => item.error !== null));
    }, 1200);
  };

  // Toggle image enabled
  const toggleEnabled = async (id: string, currentState: boolean) => {
    try {
      const res = await fetch(`/api/admin/hero-images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentState }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not toggle image");
      }
      setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, enabled: !currentState } : img))
      );
      await fetchImages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    }
  };

  // Update dates or alt
  const updateField = async (
    id: string,
    field: "alt" | "startDate" | "endDate",
    value: string | null
  ) => {
    try {
      const res = await fetch(`/api/admin/hero-images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
      await fetchImages();
      setSuccessMsg("Saved changes.");
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  // Move image up/down in order
  const moveImage = async (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const newOrder = [...images];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    setImages(newOrder);

    try {
      const orderIds = newOrder.map((img) => img.id);
      const res = await fetch("/api/admin/hero-images/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderIds }),
      });
      if (!res.ok) {
        throw new Error("Failed to persist order");
      }
    } catch {
      await fetchImages();
    }
  };

  // Delete image
  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeletingBusy(true);
    try {
      const res = await fetch(`/api/admin/hero-images/${deletingId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Delete failed");
      }
      setImages((prev) => prev.filter((img) => img.id !== deletingId));
      setDeletingId(null);
      setSuccessMsg("Image deleted.");
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingBusy(false);
    }
  };

  // Open focal point editor
  const openFocalEditor = (img: AdminHeroItem) => {
    setEditingImage(img);
    setTempFocalX(img.focalX);
    setTempFocalY(img.focalY);
  };

  // Save focal point
  const saveFocalPoint = async () => {
    if (!editingImage) return;
    setSavingFocal(true);
    try {
      const res = await fetch(`/api/admin/hero-images/${editingImage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focalX: tempFocalX, focalY: tempFocalY }),
      });
      if (!res.ok) {
        throw new Error("Failed to save focal point");
      }
      await fetchImages();
      setEditingImage(null);
      setSuccessMsg("Focal point updated.");
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save focal point");
    } finally {
      setSavingFocal(false);
    }
  };

  // Status badge styling helper
  const getBadgeStyle = (kind: HeroImageStatus["kind"]) => {
    switch (kind) {
      case "live":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "scheduled":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "expired":
        return "bg-stone-100 text-stone-500 border-stone-200";
      case "always_on":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "disabled":
      default:
        return "bg-red-50 text-red-600 border-red-200";
    }
  };

  const isAtCap = images.length >= MAX_HERO_IMAGES;

  return (
    <div className="space-y-6 pb-20">
      {/* Header with 25-Image Counter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-beige-200 pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-beige-900">Hero Images</h1>
          <p className="mt-1 text-sm text-beige-600">
            Automated hero carousel images for both logged-in and public homepages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border ${
              isAtCap
                ? "border-red-300 bg-red-50 text-red-700"
                : "border-beige-300 bg-beige-50 text-beige-800"
            }`}
          >
            <span>Stored Images:</span>
            <span className="font-mono text-sm">{images.length} / {MAX_HERO_IMAGES}</span>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          <p>{successMsg}</p>
        </div>
      )}

      {/* Upload Zone & Specs Banner */}
      <div className="rounded-xl border border-beige-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left 2 Cols: Drag-and-Drop Uploader */}
          <div className="lg:col-span-2">
            <h2 className="text-base font-semibold text-beige-900">Upload New Images</h2>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!isAtCap) handleFilesChosen(e.dataTransfer.files);
              }}
              className={`mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                isAtCap
                  ? "border-stone-200 bg-stone-50 cursor-not-allowed opacity-60"
                  : "border-beige-300 bg-beige-50/40 hover:bg-beige-50/80 cursor-pointer"
              }`}
              onClick={() => {
                if (!isAtCap) fileInputRef.current?.click();
              }}
            >
              <ImageUp className={`h-10 w-10 ${isAtCap ? "text-stone-400" : "text-beige-500"}`} />
              <p className="mt-3 text-sm font-medium text-beige-800">
                {isAtCap
                  ? `Limit of ${MAX_HERO_IMAGES} images reached`
                  : "Click to select or drag and drop image files"}
              </p>
              <p className="mt-1 text-xs text-beige-500">
                JPG, PNG, WebP · Max 5 MB per file
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={isAtCap}
                onChange={(e) => handleFilesChosen(e.target.files)}
              />
            </div>

            {/* Pending Upload Queue */}
            {uploadQueue.length > 0 && (
              <div className="mt-4 space-y-3 rounded-lg border border-beige-200 bg-beige-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-beige-700">
                  Ready to upload ({uploadQueue.length})
                </p>

                {uploadQueue.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-2 rounded bg-white p-3 border border-beige-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-beige-900 truncate max-w-xs">{item.file.name}</span>
                      <span className="text-beige-500">{(item.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-beige-600 whitespace-nowrap">Alt Text:</label>
                      <input
                        type="text"
                        value={item.alt}
                        onChange={(e) =>
                          setUploadQueue((prev) =>
                            prev.map((q, i) => (i === idx ? { ...q, alt: e.target.value } : q))
                          )
                        }
                        placeholder="Accessible description..."
                        className="flex-1 rounded border border-beige-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-beige-500"
                      />
                    </div>

                    {item.error && <p className="text-xs text-red-600">{item.error}</p>}

                    {item.progress > 0 && (
                      <div className="h-1.5 w-full rounded-full bg-beige-100 overflow-hidden">
                        <div
                          className="h-full bg-beige-600 transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setUploadQueue([])}
                    disabled={uploading}
                    className="text-xs text-beige-600 hover:text-beige-900"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={startUpload}
                    disabled={uploading}
                    className="flex items-center gap-2 rounded-full bg-beige-700 px-5 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />}
                    Upload & Process
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Col: Image Guidelines & Recommended Specs */}
          <div className="rounded-lg bg-beige-50/80 p-5 border border-beige-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-beige-800">
                <Sparkles className="h-4 w-4 text-beige-600" />
                Image Requirements
              </div>

              <ul className="mt-3 space-y-2 text-xs text-beige-600">
                <li className="flex items-start gap-1.5">
                  <span className="font-semibold text-beige-900">• Aspect ratio:</span> 2:3 portrait
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-semibold text-beige-900">• Recommended:</span> {HERO_RECOMMENDED_WIDTH}×{HERO_RECOMMENDED_HEIGHT} px (any resolution accepted)
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-semibold text-beige-900">• Formats:</span> JPG, PNG, WebP (max 5 MB)
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-semibold text-beige-900">• Safe zone:</span> Keep the main subject in the centre 50% horizontally and upper-middle vertically.
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="font-semibold text-beige-900">• Clean visual:</span> No baked-in text, logos, or price stamps.
                </li>
              </ul>
            </div>

            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
              <span className="font-semibold">Note on non-portrait photos:</span> Landscape images are accepted but will be cropped heavily on desktop and mobile. Click &quot;Crop &amp; Focal Point&quot; after uploading to adjust.
            </div>
          </div>
        </div>
      </div>

      {/* Hero Images Management List */}
      <div className="rounded-xl border border-beige-200 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-beige-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-beige-900">Manage Carousel Images</h2>
          <span className="text-xs text-beige-500">Order: Top to bottom (#1 displays first)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-beige-500" />
          </div>
        ) : images.length === 0 ? (
          <div className="py-16 text-center">
            <ImageUp className="mx-auto h-10 w-10 text-beige-300" />
            <p className="mt-2 text-sm text-beige-600">No hero images uploaded yet.</p>
            <p className="text-xs text-beige-400">The site currently displays the static default hero picture.</p>
          </div>
        ) : (
          <div className="divide-y divide-beige-200">
            {images.map((item, index) => {
              return (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center gap-4 hover:bg-beige-50/40 transition-colors">
                  {/* Reorder Up/Down */}
                  <div className="flex md:flex-col items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveImage(index, "up")}
                      className="p-1 rounded text-beige-400 hover:text-beige-800 disabled:opacity-20 hover:bg-beige-100"
                      aria-label="Move image up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-mono font-semibold text-beige-500">#{index + 1}</span>
                    <button
                      type="button"
                      disabled={index === images.length - 1}
                      onClick={() => moveImage(index, "down")}
                      className="p-1 rounded text-beige-400 hover:text-beige-800 disabled:opacity-20 hover:bg-beige-100"
                      aria-label="Move image down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Thumbnail */}
                  <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-md border border-beige-300 bg-beige-100 shadow-sm">
                    <img
                      src={item.mobileUrl}
                      alt={item.alt}
                      className="h-full w-full object-cover"
                      style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40 text-white text-[9px]"
                    >
                      {item.width}×{item.height}
                    </div>
                  </div>

                  {/* Metadata & Controls */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(item.status.kind)}`}>
                        {item.status.label}
                      </span>

                      {/* Enabled Toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-beige-700 ml-2">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => toggleEnabled(item.id, item.enabled)}
                          className="rounded border-beige-300 text-beige-700 focus:ring-beige-500"
                        />
                        <span>Enabled</span>
                      </label>
                    </div>

                    {/* Alt Text Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={item.alt}
                        onBlur={(e) => {
                          if (e.target.value !== item.alt) {
                            updateField(item.id, "alt", e.target.value);
                          }
                        }}
                        placeholder="Alt description..."
                        className="w-full max-w-md rounded border border-beige-300 px-3 py-1 text-xs text-beige-800 focus:outline-none focus:ring-1 focus:ring-beige-500"
                      />
                    </div>

                    {/* Scheduling Dates (IST) */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-beige-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-beige-400" />
                        <span>Start:</span>
                        <input
                          type="date"
                          defaultValue={item.startDate || ""}
                          onBlur={(e) => updateField(item.id, "startDate", e.target.value || null)}
                          className="rounded border border-beige-300 px-2 py-0.5 text-xs text-beige-800"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-beige-400" />
                        <span>End (inclusive):</span>
                        <input
                          type="date"
                          defaultValue={item.endDate || ""}
                          onBlur={(e) => updateField(item.id, "endDate", e.target.value || null)}
                          className="rounded border border-beige-300 px-2 py-0.5 text-xs text-beige-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions: Focal Point & Delete */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => openFocalEditor(item)}
                      className="flex items-center gap-1.5 rounded-md border border-beige-300 bg-white px-3 py-1.5 text-xs font-medium text-beige-700 shadow-sm hover:bg-beige-50 transition-colors"
                    >
                      <Crosshair className="h-3.5 w-3.5 text-beige-500" />
                      Crop & Focal Point
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingId(item.id)}
                      className="p-1.5 rounded-md text-beige-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Interactive Focal Point & Crop Preview */}
      {editingImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-w-2xl w-full rounded-2xl bg-white p-6 shadow-2xl border border-beige-200">
            <div className="flex items-center justify-between border-b border-beige-200 pb-3">
              <div>
                <h3 className="text-base font-semibold text-beige-900">Crop & Focal Point Setter</h3>
                <p className="text-xs text-beige-500">
                  Click anywhere on the preview to choose the crop centre point.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="p-1 rounded text-beige-400 hover:text-beige-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Interactive Target Canvas */}
              <div>
                <p className="text-xs font-medium text-beige-700 mb-2">Original Full Photo</p>
                <div
                  className="relative rounded-lg overflow-hidden border-2 border-dashed border-beige-300 cursor-crosshair bg-stone-100"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    setTempFocalX(Math.round(x));
                    setTempFocalY(Math.round(y));
                  }}
                >
                  <img
                    src={editingImage.desktopUrl}
                    alt={editingImage.alt}
                    className="w-full h-auto object-contain max-h-[300px]"
                  />

                  {/* Crosshair indicator */}
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                    style={{ left: `${tempFocalX}%`, top: `${tempFocalY}%` }}
                  >
                    <div className="h-7 w-7 rounded-full border-2 border-white shadow-md flex items-center justify-center bg-beige-600/60">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-beige-500">
                  <span>Focal Point:</span>
                  <span className="font-mono font-medium text-beige-800">
                    X: {tempFocalX}%, Y: {tempFocalY}%
                  </span>
                </div>
              </div>

              {/* Real-time Rendered Previews */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-beige-700 mb-1 flex items-center gap-1">
                    <Eye className="h-3 w-3 text-beige-500" />
                    Desktop Hero Crop (Square/Portrait with Ivory Fade)
                  </p>
                  <div className="relative h-32 w-full rounded-lg overflow-hidden border border-beige-300 bg-stone-200">
                    <img
                      src={editingImage.desktopUrl}
                      alt=""
                      className="h-full w-full object-cover transition-all"
                      style={{ objectPosition: `${tempFocalX}% ${tempFocalY}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 w-16 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to right, rgba(245,241,234,0.95), transparent)",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-beige-700 mb-1 flex items-center gap-1">
                    <Eye className="h-3 w-3 text-beige-500" />
                    Mobile Hero Crop (2:3 Portrait)
                  </p>
                  <div className="relative h-28 w-20 rounded-lg overflow-hidden border border-beige-300 bg-stone-200 mx-auto">
                    <img
                      src={editingImage.mobileUrl}
                      alt=""
                      className="h-full w-full object-cover transition-all"
                      style={{ objectPosition: `${tempFocalX}% ${tempFocalY}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-beige-200 pt-4">
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="px-4 py-2 text-xs font-medium text-beige-600 hover:text-beige-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingFocal}
                onClick={saveFocalPoint}
                className="flex items-center gap-2 rounded-full bg-beige-700 px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-beige-800 disabled:opacity-50"
              >
                {savingFocal ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save Focal Point
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-2xl bg-white p-6 shadow-2xl border border-beige-200">
            <h3 className="text-base font-semibold text-beige-900">Delete Image</h3>
            <p className="mt-2 text-xs leading-relaxed text-beige-600">
              Are you sure you want to delete this hero image? This removes both the desktop and mobile WebP files and frees up one slot towards the 25-image limit.
            </p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={deletingBusy}
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-medium text-beige-600 hover:text-beige-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingBusy}
                onClick={confirmDelete}
                className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

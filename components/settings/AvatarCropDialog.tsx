"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ImageIcon, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { clampCropOffset, getCoverScale, getCropSourceRect } from "@/lib/utils/avatarCrop.mjs";

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

type Point = { x: number; y: number };

export default function AvatarCropDialog({ file, locale, saving, error, onClose, onSave }: {
  file: File;
  locale: "th" | "en";
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
}) {
  const th = locale === "th";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const dragOrigin = useRef<{ pointer: Point; offset: Point } | null>(null);
  const pinchOrigin = useRef<{ distance: number; zoom: number } | null>(null);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const titleId = useId();
  const hintId = useId();
  const [source, setSource] = useState("");
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState(CROP_SIZE);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    let active = true;
    queueMicrotask(() => { if (active) setSource(url); });
    return () => { active = false; URL.revokeObjectURL(url); };
  }, [file]);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      if (dialog?.open) dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const crop = cropRef.current;
    if (!crop) return;
    const observer = new ResizeObserver(([entry]) => setCropSize(entry.contentRect.width));
    observer.observe(crop);
    return () => observer.disconnect();
  }, []);

  const clamp = (nextOffset: Point, nextZoom = zoom) => {
    if (!imageSize.width || !imageSize.height) return { x: 0, y: 0 };
    return clampCropOffset(nextOffset, imageSize.width, imageSize.height, cropSize, nextZoom);
  };

  const commitOffset = (nextOffset: Point, nextZoom = zoomRef.current) => {
    const next = clamp(nextOffset, nextZoom);
    offsetRef.current = next;
    setOffset(next);
  };

  const updateZoom = (value: number) => {
    const nextZoom = Math.max(1, Math.min(3, value));
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    commitOffset(offsetRef.current, nextZoom);
  };

  const pointerDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const reset = () => {
    zoomRef.current = 1;
    offsetRef.current = { x: 0, y: 0 };
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setEditorError(null);
  };

  const rebasePointers = () => {
    const active = [...pointers.current.values()];
    if (active.length >= 2) {
      pinchOrigin.current = { distance: Math.hypot(active[0].x - active[1].x, active[0].y - active[1].y), zoom: zoomRef.current };
      dragOrigin.current = null;
    } else if (active.length === 1) {
      pinchOrigin.current = null;
      dragOrigin.current = { pointer: active[0], offset: offsetRef.current };
    } else {
      pinchOrigin.current = null;
      dragOrigin.current = null;
    }
  };

  const save = async () => {
    const image = imageRef.current;
    if (!image || !imageSize.width || exporting || saving) return;
    setExporting(true);
    try {
      const sourceRect = getCropSourceRect({
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        cropSize,
        zoom,
        offset,
      });
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is unavailable");
      context.fillStyle = "#e2e8f0";
      context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      context.drawImage(image, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Could not create cropped image");
      await onSave(new File([blob], "avatar.jpg", { type: "image/jpeg", lastModified: Date.now() }));
    } catch {
      setEditorError(th ? "สร้างรูปที่ครอบไม่ได้ กรุณาลองเลือกรูปใหม่" : "Could not create the cropped photo. Please choose another image.");
    } finally {
      setExporting(false);
    }
  };

  const baseScale = imageSize.width && imageSize.height
    ? getCoverScale(imageSize.width, imageSize.height, cropSize)
    : 1;
  const imageStyle = imageSize.width ? {
    width: imageSize.width * baseScale * zoom,
    height: imageSize.height * baseScale * zoom,
    transform: `translate3d(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px), 0)`,
  } : undefined;
  const busy = saving || exporting;

  return <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={hintId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[96dvh] w-full max-w-none overflow-hidden rounded-t-3xl border border-mobile-border bg-mobile-surface text-mobile-ink shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-3xl">
    <div className="flex max-h-[96dvh] flex-col">
      <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-bold">{th ? "จัดตำแหน่งรูปโปรไฟล์" : "Adjust profile photo"}</h2>
          <p id={hintId} className="mt-1 text-sm leading-6 text-mobile-muted">{th ? "ลากรูปเพื่อเลือกส่วนที่ต้องการ แล้วซูมให้พอดี" : "Drag to reposition, then zoom to get the right crop."}</p>
        </div>
        <button type="button" onClick={onClose} disabled={busy} aria-label={th ? "ปิด" : "Close"}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-mobile-border bg-mobile-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 overflow-y-auto px-5 pb-4">
        <div className="mx-auto grid place-items-center">
          <div role="application" aria-label={th ? "พื้นที่ครอบรูป ลากรูปหรือใช้ปุ่มลูกศรเพื่อจัดตำแหน่ง" : "Crop area. Drag the photo or use arrow keys to reposition."}
            tabIndex={0}
            onKeyDown={event => {
              const step = event.shiftKey ? 10 : 3;
              const delta = event.key === "ArrowLeft" ? { x: -step, y: 0 }
                : event.key === "ArrowRight" ? { x: step, y: 0 }
                  : event.key === "ArrowUp" ? { x: 0, y: -step }
                    : event.key === "ArrowDown" ? { x: 0, y: step } : null;
              if (!delta) return;
              event.preventDefault();
              commitOffset({ x: offsetRef.current.x + delta.x, y: offsetRef.current.y + delta.y });
            }}
            onPointerDown={event => {
              event.currentTarget.setPointerCapture(event.pointerId);
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              rebasePointers();
            }}
            onPointerMove={event => {
              if (!pointers.current.has(event.pointerId)) return;
              pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
              if (pointers.current.size >= 2 && pinchOrigin.current) {
                const distance = pointerDistance();
                if (pinchOrigin.current.distance > 0) updateZoom(pinchOrigin.current.zoom * distance / pinchOrigin.current.distance);
                return;
              }
              const origin = dragOrigin.current;
              if (!origin) return;
              commitOffset({ x: origin.offset.x + event.clientX - origin.pointer.x, y: origin.offset.y + event.clientY - origin.pointer.y });
            }}
            onPointerUp={event => {
              pointers.current.delete(event.pointerId);
              rebasePointers();
            }}
            onPointerCancel={event => {
              pointers.current.delete(event.pointerId);
              rebasePointers();
            }}
            onLostPointerCapture={event => { pointers.current.delete(event.pointerId); rebasePointers(); }}
            ref={cropRef}
            className="relative aspect-square w-[min(280px,calc(100vw-2.75rem))] touch-none select-none overflow-hidden rounded-full bg-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.24)] outline-none ring-4 ring-white/90 focus-visible:ring-primary-500 dark:ring-slate-700">
            {!imageSize.width && <div className="absolute inset-0 grid place-items-center text-mobile-muted"><ImageIcon size={36} aria-hidden="true" /></div>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imageRef} src={source} alt="" draggable={false}
              onLoad={event => {
                setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
                reset();
              }}
              onError={() => {
                setImageSize({ width: 0, height: 0 });
                setEditorError(th ? "เปิดรูปนี้ไม่ได้ กรุณาเลือกรูปอื่น" : "This image could not be opened. Please choose another one.");
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none will-change-transform"
              style={imageStyle} />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/20" />
          </div>
        </div>

        <div className="mx-auto mt-5 flex max-w-[320px] items-center gap-3">
          <ZoomOut size={18} className="shrink-0 text-mobile-muted" aria-hidden="true" />
          <label className="sr-only" htmlFor={`${titleId}-zoom`}>{th ? "ขยายรูป" : "Zoom photo"}</label>
          <input id={`${titleId}-zoom`} type="range" min="1" max="3" step="0.01" value={zoom}
            onChange={event => updateZoom(Number(event.target.value))}
            className="h-11 min-w-0 flex-1 accent-primary-600" />
          <ZoomIn size={18} className="shrink-0 text-mobile-muted" aria-hidden="true" />
          <button type="button" onClick={reset} disabled={busy} aria-label={th ? "คืนค่าตำแหน่งและขนาด" : "Reset position and zoom"}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-mobile-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
        {(error || editorError) && <p role="alert" className="mx-auto mt-3 max-w-[320px] text-sm text-rose-600 dark:text-rose-300">{error || editorError}</p>}
      </div>

      <footer className="grid grid-cols-2 gap-3 border-t border-mobile-border bg-mobile-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onClose} disabled={busy}
          className="h-12 rounded-xl border border-mobile-border font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60">
          {th ? "ยกเลิก" : "Cancel"}
        </button>
        <button type="button" onClick={() => void save()} disabled={busy || !imageSize.width}
          className="h-12 rounded-xl bg-primary-700 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60">
          {busy ? (th ? "กำลังบันทึก…" : "Saving…") : (th ? "ใช้รูปนี้" : "Use photo")}
        </button>
      </footer>
    </div>
  </dialog>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, RotateCcw } from "lucide-react";
import jsQR from "jsqr";
import ReceiptUploader from "@/components/receipts/ReceiptUploader";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

async function readQr(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    bitmap.close();
    return jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
  } catch {
    return null;
  }
}

export default function CameraEntry({ startWithUpload = false }: { startWithUpload?: boolean }) {
  const { t } = useLanguage();
  const copy = t.mobile.camera;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const [cameraSession, setCameraSession] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (startWithUpload) return;
    let cancelled = false;

    const openCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraUnavailable(true);
        setError(copy.unsupported);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setCameraUnavailable(true);
        setError(copy.permission);
      }
    };

    void openCamera();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [copy.permission, copy.unsupported, startWithUpload, cameraSession, stopCamera]);

  useEffect(() => {
    if (!cameraReady || !videoRef.current) return;
    let cancelled = false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let frame = 0;
    let scanCount = 0;
    const scan = () => {
      const video = videoRef.current;
      if (cancelled || !video || !context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (!cancelled) frame = requestAnimationFrame(scan);
        return;
      }
      scanCount += 1;
      if (scanCount % 8 === 0) {
        const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: "attemptBoth" });
        if (code) {
          setQrValue(code.data);
          stopCamera();
          return;
        }
      }
      if (!cancelled) frame = requestAnimationFrame(scan);
    };

    frame = requestAnimationFrame(scan);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [cameraReady, stopCamera]);

  const handleImage = async (file?: File) => {
    if (!file) return;
    const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
    if (!supportedTypes.has(file.type)) {
      setError(copy.invalidType);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(copy.tooLarge);
      return;
    }
    setError(null);
    setQrValue(null);
    const value = await readQr(file);
    if (value) {
      setQrValue(value);
      stopCamera();
      return;
    }
    setImage(file);
    stopCamera();
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) {
      setError(copy.captureFailed);
      return;
    }
    await handleImage(new File([blob], `receipt-${Date.now()}.jpg`, { type: "image/jpeg" }));
  };

  if (image) return <div className="space-y-4"><div className="flex items-center justify-between"><p className="font-semibold">{copy.receiptFound}</p><button onClick={() => { setImage(null); setCameraReady(false); setCameraUnavailable(false); setError(null); setCameraSession((value) => value + 1); }} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-emerald-700"><RotateCcw size={16}/>{copy.takeAgain}</button></div><ReceiptUploader initialFile={image}/></div>;

  if (qrValue) return <div className="space-y-4"><div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40"><p className="font-semibold text-emerald-800 dark:text-emerald-200">{copy.qrFound}</p><p className="mt-2 break-all text-sm text-slate-700 dark:text-slate-200">{qrValue}</p></div><button onClick={() => { setQrValue(null); setCameraReady(false); setCameraUnavailable(false); setError(null); setCameraSession((value) => value + 1); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 py-3 font-semibold"><RotateCcw size={17}/>{copy.scanAgain}</button></div>;

  return <div className="space-y-4">
    <div className="relative overflow-hidden rounded-2xl bg-slate-950">
      {!startWithUpload && !cameraUnavailable && <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full object-cover" />}
      {(startWithUpload || cameraUnavailable) && <button onClick={() => uploadRef.current?.click()} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 text-white"><ImageUp size={34}/><span className="font-semibold">{copy.chooseImage}</span></button>}
      {!startWithUpload && !cameraUnavailable && cameraReady && <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white">{copy.scanning}</span>}
    </div>
    <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handleImage(event.target.files?.[0])}/>
    {error && <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>}
    {cameraReady && <button onClick={() => void capturePhoto()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-bold text-white"><Camera size={18}/>{copy.takeReceipt}</button>}
  </div>;
}

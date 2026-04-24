import { BrowserMultiFormatReader } from "@zxing/browser";

const BACK_CAMERA_RE = /back|rear|environment|traseira|traseiro|câmera traseira|camera traseira/i;

export async function listVideoDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await BrowserMultiFormatReader.listVideoInputDevices();
    if (Array.isArray(devices) && devices.length) return devices;
  } catch {}

  try {
    const devices = await navigator.mediaDevices?.enumerateDevices?.();
    return (devices || []).filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

export function pickPreferredCamera(devices: MediaDeviceInfo[], selectedDeviceId?: string) {
  if (selectedDeviceId) {
    const exact = devices.find((d) => d.deviceId === selectedDeviceId);
    if (exact) return exact;
  }
  return devices.find((d) => BACK_CAMERA_RE.test(`${d.label} ${d.deviceId}`)) || devices[0] || null;
}

export function stopVideoStream(video?: HTMLVideoElement | null) {
  if (!video) return;
  const stream = video.srcObject as MediaStream | null;
  if (stream) {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  }
  video.srcObject = null;
}

export async function ensureCameraAccess() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera unavailable");
  }

  const probe = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  probe.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {}
  });
}

export async function startQrDecode({
  reader,
  video,
  deviceId,
  onResult,
}: {
  reader: BrowserMultiFormatReader;
  video: HTMLVideoElement;
  deviceId?: string;
  onResult: (text: string) => void;
}) {
  const attempts: MediaStreamConstraints[] = [];

  if (deviceId) {
    attempts.push({
      audio: false,
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  }

  attempts.push(
    {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    },
    { audio: false, video: true },
  );

  let lastError: unknown = null;
  for (const constraints of attempts) {
    try {
      await reader.decodeFromConstraints(constraints, video, (result) => {
        const text = result?.getText?.()?.trim?.();
        if (text) onResult(text);
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Could not open camera");
}

export function isIosPwaStandalone() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || (navigator as any).standalone === true;
  return Boolean(isiOS && standalone);
}

function hasBarcodeDetector() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

async function decodeWithBarcodeDetector(source: CanvasImageSource): Promise<string> {
  const Detector = (window as any).BarcodeDetector;
  const detector = new Detector({ formats: ["qr_code"] });
  const codes = await detector.detect(source);
  const raw = codes?.[0]?.rawValue?.trim?.();
  if (!raw) throw new Error("No QR detected");
  return raw;
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image"));
    reader.readAsDataURL(file);
  });

  const img = new Image();
  img.decoding = "async";
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not load image"));
  });
  return img;
}

function drawNormalizedCanvas(img: HTMLImageElement) {
  const maxSide = 1600;
  const ratio = Math.min(1, maxSide / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round((img.naturalWidth || img.width || 1) * ratio));
  const height = Math.max(1, Math.round((img.naturalHeight || img.height || 1) * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export async function decodeQrFromFile(file: File, reader?: BrowserMultiFormatReader): Promise<string> {
  const img = await loadImageFromFile(file);
  const canvas = drawNormalizedCanvas(img);

  if (hasBarcodeDetector()) {
    try {
      return await decodeWithBarcodeDetector(canvas);
    } catch {}
    try {
      return await decodeWithBarcodeDetector(img);
    } catch {}
  }

  const activeReader = reader || new BrowserMultiFormatReader();
  try {
    const result = await activeReader.decodeFromImageElement(img);
    const text = result?.getText?.()?.trim?.();
    if (text) return text;
  } catch {}

  const dataUrl = canvas.toDataURL("image/png");
  const result = await activeReader.decodeFromImageUrl(dataUrl);
  const text = result?.getText?.()?.trim?.();
  if (text) return text;
  throw new Error("No QR found");
}

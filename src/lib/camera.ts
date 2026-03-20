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

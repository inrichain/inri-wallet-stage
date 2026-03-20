export type AppToastType = "success" | "error" | "warning" | "info";

export type AppToastPayload = {
  message: string;
  type?: AppToastType;
  durationMs?: number;
};

export function showAppToast(payload: AppToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-toast", { detail: payload }));
}

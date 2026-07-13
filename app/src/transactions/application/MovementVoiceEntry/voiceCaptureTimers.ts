export type MovementVoiceCaptureTimers = {
  setInterval(handler: () => void, timeoutMs: number): number;
  clearInterval(timerId: number): void;
  setTimeout(handler: () => void, timeoutMs: number): number;
  clearTimeout(timerId: number): void;
};

export const browserMovementVoiceCaptureTimers: MovementVoiceCaptureTimers = {
  setInterval: (handler, timeoutMs) => window.setInterval(handler, timeoutMs),
  clearInterval: (timerId) => window.clearInterval(timerId),
  setTimeout: (handler, timeoutMs) => window.setTimeout(handler, timeoutMs),
  clearTimeout: (timerId) => window.clearTimeout(timerId),
};

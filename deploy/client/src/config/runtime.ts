const normalizeUrl = (value?: string): string => {
  if (!value) {
    return "";
  }
  return value.trim().replace(/\/+$/, "");
};

const inCapacitor =
  typeof window !== "undefined" && window.location.protocol === "capacitor:";
const isAndroid =
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

const defaultApiBase = inCapacitor
  ? isAndroid
    ? "http://10.0.2.2:5000"
    : "http://localhost:5000"
  : "";
const defaultCognitiveBase = inCapacitor
  ? isAndroid
    ? "http://10.0.2.2:8001"
    : "http://localhost:8001"
  : "";

export const API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_API_BASE_URL || defaultApiBase
);

export const COGNITIVE_API_BASE_URL = normalizeUrl(
  import.meta.env.VITE_COGNITIVE_API_BASE_URL || defaultCognitiveBase
);

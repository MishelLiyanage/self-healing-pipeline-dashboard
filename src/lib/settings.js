// Both target-app's LoadBalancer hostname and this dashboard's own published data
// location can change (EKS recreated nightly, bucket re-deployed, etc.), so neither is
// baked into the build - they're kept in localStorage and editable from the Settings
// panel at runtime.
const KEYS = {
  targetAppUrl: "shp.targetAppUrl",
  dataUrl: "shp.dataUrl",
};

const DEFAULTS = {
  targetAppUrl: "",
  dataUrl: "",
};

function safeGet(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore - private browsing / storage blocked
  }
}

export function getTargetAppUrl() {
  return safeGet(KEYS.targetAppUrl, DEFAULTS.targetAppUrl);
}

export function setTargetAppUrl(url) {
  safeSet(KEYS.targetAppUrl, url.trim());
}

export function getDataUrl() {
  return safeGet(KEYS.dataUrl, DEFAULTS.dataUrl);
}

export function setDataUrl(url) {
  safeSet(KEYS.dataUrl, url.trim());
}

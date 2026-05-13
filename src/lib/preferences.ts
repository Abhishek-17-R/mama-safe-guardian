export type Language = "en" | "kn" | "hi" | "te" | "ta" | "ml";
export type Theme = "light" | "dark";
export type Units = "metric" | "imperial";
export type FontSize = "small" | "medium" | "large";

export interface Preferences {
  language: Language;
  theme: Theme;
  units: Units;
  fontSize: FontSize;
  notifications: boolean;
}

export const DEFAULT_PREFS: Preferences = {
  language: "en",
  theme: "light",
  units: "metric",
  fontSize: "medium",
  notifications: true,
};

const KEY = "matricare:prefs";

export function loadPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePreferences(p: Preferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(p));
  applyPreferences(p);
}

export function applyPreferences(p: Preferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", p.theme === "dark");
  root.dataset.fontSize = p.fontSize;
  const sizeMap: Record<FontSize, string> = { small: "14px", medium: "16px", large: "18px" };
  root.style.fontSize = sizeMap[p.fontSize];
  root.lang = p.language;
  // Sync i18n language. Imported lazily to avoid SSR issues.
  if (typeof window !== "undefined") {
    import("@/lib/i18n").then(({ setI18nLanguage }) => setI18nLanguage(p.language));
  }
}

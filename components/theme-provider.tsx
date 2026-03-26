"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useTheme } from "next-themes";

type TableDensity = "comfortable" | "compact" | "spacious";

const LAYOUT_STORAGE_KEY = "layout-preferences";

function getStoredPreferences() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      showAvatars?: boolean;
      tableDensity?: TableDensity;
      compact?: boolean;
    };
    return parsed;
  } catch {
    return null;
  }
}

function setStoredPreferences(prefs: {
  showAvatars?: boolean;
  tableDensity?: TableDensity;
  compact?: boolean;
}) {
  if (typeof window === "undefined") return;
  try {
    const existing = getStoredPreferences() || {};
    localStorage.setItem(
      LAYOUT_STORAGE_KEY,
      JSON.stringify({ ...existing, ...prefs })
    );
  } catch {
    // ignore
  }
}

type LayoutPreferences = {
  compact: boolean;
  setCompact: (value: boolean) => void;
  showAvatars: boolean;
  setShowAvatars: (value: boolean) => void;
  tableDensity: TableDensity;
  setTableDensity: (value: TableDensity) => void;
};

const LayoutContext = React.createContext<LayoutPreferences | null>(null);

function ThemeSyncFromServer() {
  const { setTheme } = useTheme();
  const hasSyncedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/settings/appearance", {
          credentials: "include",
        });
        if (!res.ok) return;

        const data = await res.json();
        const theme = data?.theme;
        if (cancelled) return;

        if (theme === "light" || theme === "dark" || theme === "system") {
          setTheme(theme);
        }
      } catch {
        // ignore sync failures; local fallback still works
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setTheme]);

  return null;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
}) {
  const stored = getStoredPreferences();
  const [compact, setCompact] = React.useState(stored?.compact ?? false);
  const [showAvatars, setShowAvatars] = React.useState(
    stored?.showAvatars ?? true
  );
  const [tableDensity, setTableDensity] = React.useState<TableDensity>(
    stored?.tableDensity ?? "comfortable"
  );

  React.useEffect(() => {
    const prefs = getStoredPreferences();
    if (prefs?.showAvatars !== undefined) setShowAvatars(prefs.showAvatars);
    if (prefs?.tableDensity) setTableDensity(prefs.tableDensity);
    if (prefs?.compact !== undefined) setCompact(prefs.compact);
  }, []);

  const setShowAvatarsPersisted = React.useCallback((value: boolean) => {
    setShowAvatars(value);
    setStoredPreferences({ showAvatars: value });
  }, []);

  const setTableDensityPersisted = React.useCallback((value: TableDensity) => {
    setTableDensity(value);
    setStoredPreferences({ tableDensity: value });
  }, []);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      <ThemeSyncFromServer />
      <LayoutContext.Provider
        value={{
          compact,
          setCompact,
          showAvatars,
          setShowAvatars: setShowAvatarsPersisted,
          tableDensity,
          setTableDensity: setTableDensityPersisted,
        }}
      >
        {children}
      </LayoutContext.Provider>
    </NextThemesProvider>
  );
}

export function useLayoutPreferences() {
  const ctx = React.useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayoutPreferences must be used within ThemeProvider");
  }
  return ctx;
}

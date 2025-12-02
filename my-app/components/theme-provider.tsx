"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type TableDensity = "comfortable" | "compact" | "spacious";

type LayoutPreferences = {
  compact: boolean;
  setCompact: (value: boolean) => void;
  showAvatars: boolean;
  setShowAvatars: (value: boolean) => void;
  tableDensity: TableDensity;
  setTableDensity: (value: TableDensity) => void;
};

const LayoutContext = React.createContext<LayoutPreferences | null>(null);

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: "light" | "dark" | "system";
}) {
  const [compact, setCompact] = React.useState(false);
  const [showAvatars, setShowAvatars] = React.useState(true);
  const [tableDensity, setTableDensity] =
    React.useState<TableDensity>("comfortable");

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      <LayoutContext.Provider
        value={{
          compact,
          setCompact,
          showAvatars,
          setShowAvatars,
          tableDensity,
          setTableDensity,
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

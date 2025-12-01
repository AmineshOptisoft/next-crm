"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

type LayoutPreferences = {
  compact: boolean;
  setCompact: (value: boolean) => void;
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

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
    >
      <LayoutContext.Provider value={{ compact, setCompact }}>
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

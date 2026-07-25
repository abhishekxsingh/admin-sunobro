"use client";

import { useEffect, useState, useCallback } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "sb_admin_theme";

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "light") {
    html.classList.add("light");
    html.classList.remove("dark");
  } else {
    html.classList.remove("light");
    html.classList.add("dark");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial = stored ?? "dark";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return { theme, setTheme, toggle };
}

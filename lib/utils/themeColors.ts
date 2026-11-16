export const themeColors = { light: "#ffffff", dark: "#020617" } as const;

export const themeColorMetadata = [
  { media: "(prefers-color-scheme: light)", color: themeColors.light },
  { media: "(prefers-color-scheme: dark)", color: themeColors.dark },
];

// Runs before page content is painted, including on first visits in system mode.
export const initializeThemeScript = `
(() => {
  const root = document.documentElement;
  let preference = root.dataset.themePreference;
  if (!/(?:^|;\\s*)app_theme=/.test(document.cookie)) {
    try { preference = localStorage.getItem("theme") || preference; } catch {}
  }
  const dark = preference === "dark" ||
    (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.dataset.theme = dark ? "dark" : "light";
  const color = dark ? "${themeColors.dark}" : "${themeColors.light}";
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => { meta.content = color; });
})();
`;

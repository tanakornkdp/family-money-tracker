export function isStandaloneApp() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean };
  return iosNavigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

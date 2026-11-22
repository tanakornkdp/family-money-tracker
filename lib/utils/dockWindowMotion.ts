export const DOCK_WINDOW_DURATION_MS = 420;
const samples = 20;
const rows = 8;
const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const ease = (value: number) => value * value * (3 - 2 * value);

export function animateDockWindow(windowElement: HTMLElement, trigger: HTMLElement, opening: boolean) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !CSS.supports("clip-path", "polygon(0 0, 100% 0, 100% 100%)") ||
      typeof windowElement.animate !== "function") return;

  const box = windowElement.getBoundingClientRect();
  const icon = (trigger.querySelector("svg") ?? trigger).getBoundingClientRect();
  if (!box.width || !box.height || !icon.width) return;

  const x = icon.left + icon.width / 2 - box.left;
  const y = icon.top + icon.height / 2 - box.top;
  const targetAbove = y < box.height / 2;
  const frames: Keyframe[] = Array.from({ length: samples + 1 }, (_, index) => {
    const time = index / samples;
    const progress = ease(opening ? 1 - time : time);
    const nearPull = 1 - (1 - progress) ** 1.45;
    const farPull = progress ** 1.65;
    const top = mix(0, y - 2, targetAbove ? nearPull : farPull);
    const bottom = mix(box.height, y + 2, targetAbove ? farPull : nearPull);
    const height = Math.max(2, bottom - top);
    const edges = Array.from({ length: rows + 1 }, (_, index) => {
      const row = index / rows;
      const pull = mix(progress ** 2.2, 1 - (1 - progress) ** 2.8, ease(targetAbove ? 1 - row : row));
      const center = mix(box.width / 2, x, pull);
      const halfWidth = mix(box.width / 2, 2, pull);
      return { left: center - halfWidth, right: center + halfWidth, row };
    });
    const left = Math.min(...edges.map(edge => edge.left));
    const width = Math.max(...edges.map(edge => edge.right)) - left;
    const point = (edge: (typeof edges)[number], side: "left" | "right") =>
      `${(edge[side] - left) / width * 100}% ${edge.row * 100}%`;
    return {
      offset: time,
      transformOrigin: "top left",
      transform: `translate(${left}px, ${top}px) scale(${width / box.width}, ${height / box.height})`,
      clipPath: `polygon(${[...edges.map(edge => point(edge, "left")), ...edges.reverse().map(edge => point(edge, "right"))].join(",")})`,
      opacity: progress > 0.96 ? (1 - progress) / 0.04 : 1,
    };
  });
  return windowElement.animate(frames, { duration: DOCK_WINDOW_DURATION_MS, fill: "both" });
}

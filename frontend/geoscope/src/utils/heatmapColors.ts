/**
 * Multi-stop gradient: low news → high news.
 *   0.0  = deep teal (quiet)
 *   0.25 = cyan
 *   0.50 = amber/yellow
 *   0.75 = orange
 *   1.0  = bright red (most active)
 */
const GRADIENT_STOPS: { t: number; r: number; g: number; b: number }[] = [
  { t: 0.0, r: 15, g: 118, b: 110 },   // teal-700
  { t: 0.25, r: 34, g: 211, b: 238 },   // cyan-400
  { t: 0.50, r: 250, g: 204, b: 21 },   // yellow-400
  { t: 0.75, r: 249, g: 115, b: 22 },   // orange-500
  { t: 1.0, r: 239, g: 68, b: 68 },     // red-500
];

function interpolateGradient(heat: number): { r: number; g: number; b: number } {
  const h = Math.max(0, Math.min(1, heat));

  // Find the two stops surrounding h
  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    const a = GRADIENT_STOPS[i];
    const b = GRADIENT_STOPS[i + 1];
    if (h >= a.t && h <= b.t) {
      const local = (h - a.t) / (b.t - a.t);
      return {
        r: Math.round(a.r + (b.r - a.r) * local),
        g: Math.round(a.g + (b.g - a.g) * local),
        b: Math.round(a.b + (b.b - a.b) * local),
      };
    }
  }

  const last = GRADIENT_STOPS[GRADIENT_STOPS.length - 1];
  return { r: last.r, g: last.g, b: last.b };
}

export function heatToHex(heat: number): string {
  const { r, g, b } = interpolateGradient(heat);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function heatToRgb(heat: number): [number, number, number] {
  const { r, g, b } = interpolateGradient(heat);
  return [r / 255, g / 255, b / 255];
}

export function getHeatLabel(heat: number): string {
  if (heat < 0.2) return "Low";
  if (heat < 0.4) return "Light";
  if (heat < 0.6) return "Moderate";
  if (heat < 0.8) return "High";
  return "Peak";
}

export const HEATMAP_GRADIENT_STOPS = [0, 0.25, 0.5, 0.75, 1] as const;

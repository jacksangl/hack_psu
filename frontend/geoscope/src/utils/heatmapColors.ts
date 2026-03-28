// Convert heat value (0-1) to a color gradient
// 0 = cool (no sources) -> 1 = hot (many sources)
export function heatToHex(heat: number): string {
  // Clamp between 0 and 1
  const h = Math.max(0, Math.min(1, heat));

  // Blue (cold) -> Cyan -> Yellow -> Orange -> Red (hot)
  if (h < 0.25) {
    // Blue to Cyan
    const t = h / 0.25;
    const r = Math.round(0 * 255);
    const g = Math.round((0.5 + t * 0.5) * 255);
    const b = Math.round(255);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } else if (h < 0.5) {
    // Cyan to Yellow
    const t = (h - 0.25) / 0.25;
    const r = Math.round(t * 255);
    const g = Math.round(255);
    const b = Math.round((1 - t) * 255);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } else if (h < 0.75) {
    // Yellow to Orange
    const t = (h - 0.5) / 0.25;
    const r = Math.round(255);
    const g = Math.round((1 - t * 0.5) * 255);
    const b = Math.round(0);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  } else {
    // Orange to Red
    const t = (h - 0.75) / 0.25;
    const r = Math.round(255);
    const g = Math.round((0.5 - t * 0.5) * 255);
    const b = Math.round(0);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }
}

export function heatToRgb(heat: number): [number, number, number] {
  const h = Math.max(0, Math.min(1, heat));

  if (h < 0.25) {
    const t = h / 0.25;
    return [0, 0.5 + t * 0.5, 1];
  } else if (h < 0.5) {
    const t = (h - 0.25) / 0.25;
    return [t, 1, 1 - t];
  } else if (h < 0.75) {
    const t = (h - 0.5) / 0.25;
    return [1, 1 - t * 0.5, 0];
  } else {
    const t = (h - 0.75) / 0.25;
    return [1, 0.5 - t * 0.5, 0];
  }
}

export function getHeatLabel(heat: number): string {
  if (heat < 0.2) return "Very Cold";
  if (heat < 0.4) return "Cold";
  if (heat < 0.6) return "Warm";
  if (heat < 0.8) return "Hot";
  return "Very Hot";
}

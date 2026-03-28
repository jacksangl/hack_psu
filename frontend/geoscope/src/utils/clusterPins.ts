import type { Sentiment } from "./sentimentColors";

export interface PinData {
  id: string;
  title: string;
  lat: number;
  lng: number;
  sentiment: Sentiment;
  url: string;
  source: string;
}

export interface ClusteredPin {
  id: string;
  lat: number;
  lng: number;
  sentiment: Sentiment;
  pins: PinData[];
  count: number;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const CRISIS_PRIORITY: Record<Sentiment, number> = {
  crisis: 3,
  negative: 2,
  neutral: 1,
  positive: 0,
};

export function clusterPins(
  pins: PinData[],
  radiusKm: number = 200
): ClusteredPin[] {
  const used = new Set<string>();
  const clusters: ClusteredPin[] = [];

  for (const pin of pins) {
    if (used.has(pin.id)) continue;

    const group: PinData[] = [pin];
    used.add(pin.id);

    for (const other of pins) {
      if (used.has(other.id)) continue;
      const dist = haversineDistance(pin.lat, pin.lng, other.lat, other.lng);
      if (dist <= radiusKm) {
        group.push(other);
        used.add(other.id);
      }
    }

    const avgLat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const avgLng = group.reduce((s, p) => s + p.lng, 0) / group.length;

    const dominantSentiment = group.reduce((best, p) =>
      CRISIS_PRIORITY[p.sentiment] > CRISIS_PRIORITY[best.sentiment] ? p : best
    ).sentiment;

    clusters.push({
      id: `cluster-${pin.id}`,
      lat: avgLat,
      lng: avgLng,
      sentiment: dominantSentiment,
      pins: group,
      count: group.length,
    });
  }

  return clusters;
}

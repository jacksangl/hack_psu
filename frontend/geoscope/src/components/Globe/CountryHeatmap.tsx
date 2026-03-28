import { useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import * as topojson from "topojson-client";
import type { Topology } from "topojson-specification";
import type { Geometry } from "geojson";
import { useGlobeStore } from "../../store/globeStore";
import { sentimentToHex } from "../../utils/sentimentColors";

const TOPO_URL = "https://unpkg.com/world-atlas@2/countries-50m.json";
const TEX_W = 4096;
const TEX_H = 2048;

// ISO 3166-1 numeric → alpha-2 (unpadded, matching topojson-client output)
const NUM_TO_ALPHA2: Record<string, string> = {
  "840": "US", "76": "BR", "356": "IN", "276": "DE", "156": "CN",
  "566": "NG", "804": "UA", "36": "AU", "826": "GB", "250": "FR",
  "392": "JP", "410": "KR", "124": "CA", "484": "MX", "710": "ZA",
  "682": "SA", "643": "RU", "380": "IT", "724": "ES", "792": "TR",
  "616": "PL", "32": "AR", "818": "EG", "764": "TH", "360": "ID",
  "586": "PK", "50": "BD", "608": "PH", "704": "VN", "231": "ET",
  "404": "KE", "170": "CO", "752": "SE", "578": "NO", "376": "IL",
  "152": "CL", "604": "PE", "300": "GR", "554": "NZ", "364": "IR",
  "368": "IQ",
};

function toCanvas(lng: number, lat: number): [number, number] {
  return [((lng + 180) / 360) * TEX_W, ((90 - lat) / 180) * TEX_H];
}

function traceRing(ctx: CanvasRenderingContext2D, ring: number[][]) {
  if (ring.length === 0) return;
  const [x0, y0] = toCanvas(ring[0][0], ring[0][1]);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < ring.length; i++) {
    const [x, y] = toCanvas(ring[i][0], ring[i][1]);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function fillGeometry(ctx: CanvasRenderingContext2D, geom: Geometry) {
  ctx.beginPath();
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) traceRing(ctx, ring);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates)
      for (const ring of poly) traceRing(ctx, ring);
  }
  ctx.fill();
}

function strokeGeometry(ctx: CanvasRenderingContext2D, geom: Geometry) {
  ctx.beginPath();
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) traceRing(ctx, ring);
  } else if (geom.type === "MultiPolygon") {
    for (const poly of geom.coordinates)
      for (const ring of poly) traceRing(ctx, ring);
  }
  ctx.stroke();
}

export function CountryHeatmap() {
  const [topoData, setTopoData] = useState<Topology | null>(null);
  const globalSentiment = useGlobeStore((s) => s.globalSentiment);
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);

  useEffect(() => {
    fetch(TOPO_URL)
      .then((r) => r.json())
      .then((d: Topology) => setTopoData(d))
      .catch(() => {});
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = useMemo<any[] | null>(() => {
    if (!topoData) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fc = topojson.feature(topoData, topoData.objects.countries as any) as any;
    return fc.features;
  }, [topoData]);

  const texture = useMemo(() => {
    if (!features) return null;

    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, TEX_W, TEX_H);

    // --- pass 1: draw all countries ---
    for (const feature of features) {
      const alpha2 = NUM_TO_ALPHA2[String(feature.id)];
      const entry = alpha2 ? globalSentiment[alpha2] : null;
      const isSelected = alpha2 != null && alpha2 === selectedCountry;

      if (isSelected) {
        // selected country drawn in pass 2
        continue;
      } else if (entry) {
        ctx.fillStyle = sentimentToHex(entry.sentiment);
        ctx.globalAlpha = 0.18;
      } else {
        ctx.fillStyle = "#475569";
        ctx.globalAlpha = 0.07;
      }
      fillGeometry(ctx, feature.geometry);
    }

    // --- pass 2: selected country on top ---
    if (selectedCountry) {
      const selFeature = features.find(
        (f: any) => NUM_TO_ALPHA2[String(f.id)] === selectedCountry
      );
      if (selFeature) {
        const entry = globalSentiment[selectedCountry];
        const color = entry ? sentimentToHex(entry.sentiment) : "#14b8a6";

        // bright fill
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        fillGeometry(ctx, selFeature.geometry);

        // glowing border
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        strokeGeometry(ctx, selFeature.geometry);

        // outer glow pass
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.globalAlpha = 0.25;
        strokeGeometry(ctx, selFeature.geometry);
      }
    }

    ctx.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [features, globalSentiment, selectedCountry]);

  if (!texture) return null;

  return (
    <mesh>
      <sphereGeometry args={[2.004, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

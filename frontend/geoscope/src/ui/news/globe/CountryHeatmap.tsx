import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import * as topojson from "topojson-client";
import type { Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { useCountryVisualHeatData } from "../../../data/news/hooks/useCountryVisualHeatData";
import { useGlobeStore } from "../../../store/globeStore";
import { COUNTRIES } from "../../../utils/countryData";
import { heatToHex } from "../../../utils/heatmapColors";

const TOPO_URL = "https://unpkg.com/world-atlas@2/countries-50m.json";
const TEX_W = 4096;
const TEX_H = 2048;
const OVERLAY_RADIUS = 2.002;
const STRIPE_SPACING = 28;
const STRIPE_LINE_WIDTH = 4;
const STRIPE_SLOPE = 0.68;

// ISO 3166-1 numeric -> alpha-2 (unpadded, matching topojson-client output)
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

const TOPO_NAME_TO_ALPHA2: Record<string, string> = {
  "bolivia plurinational state of": "BO",
  "bosnia and herzegovina": "BA",
  "brunei darussalam": "BN",
  "cabo verde": "CV",
  "central african rep": "CF",
  "congo": "CG",
  "dr congo": "CD",
  "czechia": "CZ",
  "dem rep congo": "CD",
  "democratic republic of congo": "CD",
  "democratic republic of the congo": "CD",
  "dominican rep": "DO",
  "eq guinea": "GQ",
  "eswatini": "SZ",
  "iran": "IR",
  "ivory coast": "CI",
  "korea": "KR",
  "lao pdr": "LA",
  "moldova": "MD",
  "north korea": "KP",
  "republic of congo": "CG",
  "republic of the congo": "CG",
  "russian federation": "RU",
  "s sudan": "SS",
  "solomon is": "SB",
  "south korea": "KR",
  "syria": "SY",
  "timor-leste": "TL",
  "united republic of tanzania": "TZ",
  "united states of america": "US",
  "viet nam": "VN",
};

function normalizeCountryName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COUNTRY_CODE_BY_NAME = new Map<string, string>(
  COUNTRIES.map((country) => [normalizeCountryName(country.name), country.code])
);

function resolveFeatureCountryCode(feature: {
  id?: string | number;
  properties?: { name?: string };
}) {
  const topoName = feature.properties?.name;
  if (topoName) {
    const normalized = normalizeCountryName(topoName);
    const aliasedCode = TOPO_NAME_TO_ALPHA2[normalized];
    if (aliasedCode) {
      return aliasedCode;
    }

    const exactCode = COUNTRY_CODE_BY_NAME.get(normalized);
    if (exactCode) {
      return exactCode;
    }
  }

  return NUM_TO_ALPHA2[String(feature.id)];
}

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

function traceGeometryPath(ctx: CanvasRenderingContext2D, geom: Geometry) {
  if (geom.type === "Polygon") {
    for (const ring of geom.coordinates) traceRing(ctx, ring);
  } else if (geom.type === "MultiPolygon") {
    for (const polygon of geom.coordinates) {
      for (const ring of polygon) traceRing(ctx, ring);
    }
  }
}

function fillGeometry(ctx: CanvasRenderingContext2D, geom: Geometry) {
  ctx.beginPath();
  traceGeometryPath(ctx, geom);
  ctx.fill();
}

function strokeGeometry(ctx: CanvasRenderingContext2D, geom: Geometry) {
  ctx.beginPath();
  traceGeometryPath(ctx, geom);
  ctx.stroke();
}

function drawStripedGeometry(
  ctx: CanvasRenderingContext2D,
  geom: Geometry,
  strokeStyle: string,
  alpha: number
) {
  ctx.save();
  ctx.beginPath();
  traceGeometryPath(ctx, geom);
  ctx.clip();
  ctx.strokeStyle = strokeStyle;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = STRIPE_LINE_WIDTH;
  ctx.lineCap = "round";

  for (let x = -TEX_H; x <= TEX_W + TEX_H; x += STRIPE_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + TEX_H * STRIPE_SLOPE, TEX_H);
    ctx.stroke();
  }

  ctx.restore();
}

export function CountryHeatmap() {
  const [topoData, setTopoData] = useState<Topology | null>(null);
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const heatData = useCountryVisualHeatData();

  useEffect(() => {
    fetch(TOPO_URL)
      .then((response) => response.json())
      .then((data: Topology) => setTopoData(data))
      .catch(() => {});
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const features = useMemo<any[] | null>(() => {
    if (!topoData) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const featureCollection = topojson.feature(
      topoData,
      topoData.objects.countries as any
    ) as any;
    return featureCollection.features;
  }, [topoData]);

  const texture = useMemo(() => {
    if (!features) return null;

    const canvas = document.createElement("canvas");
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.clearRect(0, 0, TEX_W, TEX_H);

    for (const feature of features) {
      const countryCode = resolveFeatureCountryCode(feature);
      if (!countryCode) continue;

      const entry = heatData[countryCode];
      if (!entry) continue;

      if (countryCode === selectedCountry) {
        continue;
      }

      const color = heatToHex(entry.heat);
      const stripeColor = new THREE.Color(color)
        .lerp(new THREE.Color("#f8fafc"), 0.16)
        .getStyle();

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.12 + entry.heat * 0.22;
      fillGeometry(ctx, feature.geometry);
      drawStripedGeometry(
        ctx,
        feature.geometry,
        stripeColor,
        0.12 + entry.heat * 0.08
      );
    }

    if (selectedCountry) {
      const selectedFeature = features.find(
        (feature: any) => resolveFeatureCountryCode(feature) === selectedCountry
      );
      const selectedHeat = heatData[selectedCountry];

      if (selectedFeature && selectedHeat) {
        const color = heatToHex(selectedHeat.heat);
        const stripeColor = new THREE.Color(color)
          .lerp(new THREE.Color("#ffffff"), 0.22)
          .getStyle();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.2 + selectedHeat.heat * 0.24;
        fillGeometry(ctx, selectedFeature.geometry);
        drawStripedGeometry(
          ctx,
          selectedFeature.geometry,
          stripeColor,
          0.18 + selectedHeat.heat * 0.08
        );

        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.62;
        strokeGeometry(ctx, selectedFeature.geometry);

        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.globalAlpha = 0.22;
        strokeGeometry(ctx, selectedFeature.geometry);
      }
    }

    // Fade out polar caps to prevent equirectangular stripe convergence artifacts
    const POLE_FADE_PX = 260;
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;

    const northGrad = ctx.createLinearGradient(0, 0, 0, POLE_FADE_PX);
    northGrad.addColorStop(0, "rgba(0,0,0,1)");
    northGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = northGrad;
    ctx.fillRect(0, 0, TEX_W, POLE_FADE_PX);

    const southGrad = ctx.createLinearGradient(0, TEX_H - POLE_FADE_PX, 0, TEX_H);
    southGrad.addColorStop(0, "rgba(0,0,0,0)");
    southGrad.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = southGrad;
    ctx.fillRect(0, TEX_H - POLE_FADE_PX, TEX_W, POLE_FADE_PX);

    ctx.globalCompositeOperation = "source-over";

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [features, heatData, selectedCountry]);

  if (!texture) return null;

  return (
    <mesh>
      <sphereGeometry args={[OVERLAY_RADIUS, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

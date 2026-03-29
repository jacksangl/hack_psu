import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import * as topojson from "topojson-client";
import type { Geometry } from "geojson";
import type { Topology } from "topojson-specification";
import { useCountryVisualHeatData } from "../../../data/news/hooks/useCountryVisualHeatData";
import { computeHeatmapSignature } from "../../../data/news/processing/computeHeatmapSignature";
import { selectVisibleCountries } from "../../../data/news/processing/selectVisibleCountries";
import { useGlobeStore } from "../../../store/globeStore";
import { heatToHex } from "../../../utils/heatmapColors";
import { NEWS_GLOBE_CONFIG } from "./globeConfig";
import {
  resolveFeatureCountryCode,
  type CountryFeature,
} from "./countryTopology";

function toCanvas(lng: number, lat: number): [number, number] {
  return [
    ((lng + 180) / 360) * NEWS_GLOBE_CONFIG.heatmap.textureWidth,
    ((90 - lat) / 180) * NEWS_GLOBE_CONFIG.heatmap.textureHeight,
  ];
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
  ctx.lineWidth = NEWS_GLOBE_CONFIG.heatmap.stripeLineWidth;
  ctx.lineCap = "round";

  const { textureHeight, textureWidth, stripeSlope, stripeSpacing } =
    NEWS_GLOBE_CONFIG.heatmap;
  for (
    let x = -textureHeight;
    x <= textureWidth + textureHeight;
    x += stripeSpacing
  ) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + textureHeight * stripeSlope, textureHeight);
    ctx.stroke();
  }

  ctx.restore();
}

function buildBaseHeatmapTexture(
  features: CountryFeature[],
  heatByCountry: ReturnType<typeof useCountryVisualHeatData>,
  visibleCountryCodes: Set<string>
) {
  const canvas = document.createElement("canvas");
  canvas.width = NEWS_GLOBE_CONFIG.heatmap.textureWidth;
  canvas.height = NEWS_GLOBE_CONFIG.heatmap.textureHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { textureWidth, textureHeight } = NEWS_GLOBE_CONFIG.heatmap;
  ctx.clearRect(0, 0, textureWidth, textureHeight);

  for (const feature of features) {
    const countryCode = resolveFeatureCountryCode(feature);
    if (!countryCode || !visibleCountryCodes.has(countryCode)) {
      continue;
    }

    const entry = heatByCountry[countryCode];
    if (!entry) {
      continue;
    }

    const color = heatToHex(entry.heat);
    const stripeColor = new THREE.Color(color)
      .lerp(new THREE.Color("#f8fafc"), 0.22)
      .getStyle();

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.08 + entry.heat * 0.24;
    fillGeometry(ctx, feature.geometry);
    drawStripedGeometry(
      ctx,
      feature.geometry,
      stripeColor,
      0.06 + entry.heat * 0.08
    );
  }

  const poleFadePx = 180;
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;

  const northGradient = ctx.createLinearGradient(0, 0, 0, poleFadePx);
  northGradient.addColorStop(0, "rgba(0,0,0,1)");
  northGradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = northGradient;
  ctx.fillRect(0, 0, textureWidth, poleFadePx);

  const southGradient = ctx.createLinearGradient(
    0,
    textureHeight - poleFadePx,
    0,
    textureHeight
  );
  southGradient.addColorStop(0, "rgba(0,0,0,0)");
  southGradient.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = southGradient;
  ctx.fillRect(0, textureHeight - poleFadePx, textureWidth, poleFadePx);

  ctx.globalCompositeOperation = "source-over";

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function CountryHeatmap() {
  const [topoData, setTopoData] = useState<Topology | null>(null);
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const heatData = useCountryVisualHeatData();
  const selectedCategory = useGlobeStore((state) => state.selectedCategory);
  const heatmapDirty = useGlobeStore((state) => state.heatmapDirty);
  const isInteracting = useGlobeStore(
    (state) => state.isInteracting || state.isCameraAnimating
  );
  const setHeatmapDirty = useGlobeStore((state) => state.setHeatmapDirty);
  const lastAppliedSignatureRef = useRef("");
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    fetch(NEWS_GLOBE_CONFIG.heatmap.topoUrl)
      .then((response) => response.json())
      .then((data: Topology) => setTopoData(data))
      .catch(() => {});
  }, []);

  const features = useMemo<CountryFeature[] | null>(() => {
    if (!topoData) return null;
    const featureCollection = topojson.feature(
      topoData,
      topoData.objects.countries as any
    ) as unknown as { features: CountryFeature[] };
    return featureCollection.features;
  }, [topoData]);

  const visibleCountries = useMemo(
    () =>
      selectVisibleCountries(heatData, {
        limit: NEWS_GLOBE_CONFIG.visibleCountryLimit,
      }),
    [heatData]
  );

  const heatmapSignature = useMemo(
    () =>
      computeHeatmapSignature(
        visibleCountries,
        selectedCategory,
        NEWS_GLOBE_CONFIG.heatmap.heatBucketCount
      ),
    [selectedCategory, visibleCountries]
  );

  useEffect(() => {
    if (!features) {
      return;
    }

    if (!heatmapDirty && textureRef.current) {
      return;
    }

    if (heatmapSignature === lastAppliedSignatureRef.current) {
      if (heatmapDirty) {
        setHeatmapDirty(false);
      }
      return;
    }

    if (isInteracting) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const nextTexture = buildBaseHeatmapTexture(
        features,
        heatData,
        new Set(visibleCountries.map((entry) => entry.countryCode))
      );

      if (!nextTexture) {
        return;
      }

      const previousTexture = textureRef.current;
      textureRef.current = nextTexture;
      lastAppliedSignatureRef.current = heatmapSignature;
      setTexture(nextTexture);
      setHeatmapDirty(false);
      previousTexture?.dispose();
    }, NEWS_GLOBE_CONFIG.heatmap.rebuildDebounceMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    features,
    heatData,
    heatmapDirty,
    heatmapSignature,
    isInteracting,
    setHeatmapDirty,
    visibleCountries,
  ]);

  useEffect(() => {
    return () => {
      textureRef.current?.dispose();
    };
  }, []);

  if (!texture) {
    return null;
  }

  return (
    <mesh>
      <sphereGeometry args={[NEWS_GLOBE_CONFIG.heatmap.overlayRadius, 64, 64]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

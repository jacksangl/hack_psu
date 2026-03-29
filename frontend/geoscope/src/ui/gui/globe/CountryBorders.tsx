import { useMemo, useState, useEffect } from "react";
import * as THREE from "three";
import * as topojson from "topojson-client";
import type { Topology } from "topojson-specification";
import { latLngToVector3 } from "../../../utils/geoHelpers";
import { NEWS_GLOBE_CONFIG } from "../../news/globe/globeConfig";

// 110m is much smaller than 50m (~150 KB vs ~1 MB) — big perf win
const BORDERS_URL = NEWS_GLOBE_CONFIG.heatmap.topoUrl;
const GLOBE_RADIUS = 2.004;
const BORDER_GLOW_SCALE = 1.00055;

// Subdivide long segments so lines hug the sphere surface
function subdivideSegment(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  radius: number
): THREE.Vector3[] {
  const p1 = latLngToVector3(lat1, lng1, radius);
  const p2 = latLngToVector3(lat2, lng2, radius);
  const angle = p1.angleTo(p2);

  // ~5 degrees — fewer subdivisions for better performance
  if (angle < 0.11) {
    return [p1, p2];
  }

  const steps = Math.ceil(angle / 0.11);
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt = new THREE.Vector3().lerpVectors(p1, p2, t);
    pt.normalize().multiplyScalar(radius);
    points.push(pt);
  }
  return points;
}

export function CountryBorders() {
  const [topoData, setTopoData] = useState<Topology | null>(null);

  useEffect(() => {
    fetch(BORDERS_URL)
      .then((res) => res.json())
      .then((data: Topology) => setTopoData(data))
      .catch(() => {});
  }, []);

  const geometry = useMemo(() => {
    if (!topoData) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const borders = topojson.mesh(topoData, topoData.objects.countries as any);
    const segments: THREE.Vector3[] = [];

    for (const line of borders.coordinates) {
      for (let i = 0; i < line.length - 1; i++) {
        const [lng1, lat1] = line[i];
        const [lng2, lat2] = line[i + 1];
        const pts = subdivideSegment(lat1, lng1, lat2, lng2, GLOBE_RADIUS);

        for (let j = 0; j < pts.length - 1; j++) {
          segments.push(pts[j], pts[j + 1]);
        }
      }
    }

    return new THREE.BufferGeometry().setFromPoints(segments);
  }, [topoData]);

  if (!geometry) return null;

  return (
    <group>
      <lineSegments
        geometry={geometry}
        scale={[BORDER_GLOW_SCALE, BORDER_GLOW_SCALE, BORDER_GLOW_SCALE]}
      >
        <lineBasicMaterial
          color="#14b8a6"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </lineSegments>

      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          color="#c3f5ff"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}

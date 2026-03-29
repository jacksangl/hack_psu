import { useEffect, useRef, useMemo, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { greatCirclePoints } from "../../../utils/geoHelpers";

interface ArcLineProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color?: string;
  opacity?: number;
}

function ArcLineComponent({
  startLat,
  startLng,
  endLat,
  endLng,
  color = "#EF9F27",
  opacity = 0.6,
}: ArcLineProps) {
  const progressRef = useRef(0);

  const { geometry, material, line, totalPoints } = useMemo(() => {
    const points = greatCirclePoints(startLat, startLng, endLat, endLng, 24);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
    });
    const arcLine = new THREE.Line(geo, mat);
    return { geometry: geo, material: mat, line: arcLine, totalPoints: points.length };
  }, [startLat, startLng, endLat, endLng, color, opacity]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    if (progressRef.current >= 1) return;

    progressRef.current = Math.min(progressRef.current + delta / 1.2, 1);
    const drawCount = Math.floor(progressRef.current * totalPoints);
    geometry.setDrawRange(0, drawCount);
  });

  return <primitive object={line} />;
}

export const ArcLine = memo(ArcLineComponent);

import { useRef, useMemo, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { greatCirclePoints } from "../../utils/geoHelpers";

interface ArcLineProps {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

function ArcLineComponent({ startLat, startLng, endLat, endLng }: ArcLineProps) {
  const lineRef = useRef<THREE.Line>(null);
  const progressRef = useRef(0);

  const { geometry, totalPoints } = useMemo(() => {
    const points = greatCirclePoints(startLat, startLng, endLat, endLng, 24);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return { geometry: geo, totalPoints: points.length };
  }, [startLat, startLng, endLat, endLng]);

  useFrame((_, delta) => {
    if (!lineRef.current) return;

    progressRef.current = Math.min(progressRef.current + delta / 1.2, 1);
    const drawCount = Math.floor(progressRef.current * totalPoints);
    geometry.setDrawRange(0, drawCount);
  });

  return (
    <line ref={lineRef as React.RefObject<THREE.Line>} geometry={geometry}>
      <lineBasicMaterial
        color="#EF9F27"
        transparent
        opacity={0.6}
        linewidth={1}
      />
    </line>
  );
}

export const ArcLine = memo(ArcLineComponent);

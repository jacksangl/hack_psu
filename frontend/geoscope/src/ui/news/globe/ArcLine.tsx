import { useEffect, useRef, useMemo, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { greatCirclePoints } from "../../../utils/geoHelpers";

const ARC_TUBE_RADIUS = 0.008;
const ARC_GLOW_RADIUS = 0.022;
const ARC_SEGMENTS = 48;
const ARC_RADIAL_SEGMENTS = 6;
const DRAW_SPEED = 1.6;

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
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const { curve, coreGeometry, coreMaterial, glowGeometry, glowMaterial } =
    useMemo(() => {
      const points = greatCirclePoints(
        startLat,
        startLng,
        endLat,
        endLng,
        ARC_SEGMENTS
      );
      const c = new THREE.CatmullRomCurve3(points);

      const coreGeo = new THREE.TubeGeometry(
        c,
        ARC_SEGMENTS,
        ARC_TUBE_RADIUS,
        ARC_RADIAL_SEGMENTS,
        false
      );
      const coreMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        depthWrite: false,
      });

      const glowGeo = new THREE.TubeGeometry(
        c,
        ARC_SEGMENTS,
        ARC_GLOW_RADIUS,
        ARC_RADIAL_SEGMENTS,
        false
      );
      const glowMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: opacity * 0.25,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      });

      return {
        curve: c,
        coreGeometry: coreGeo,
        coreMaterial: coreMat,
        glowGeometry: glowGeo,
        glowMaterial: glowMat,
      };
    }, [startLat, startLng, endLat, endLng, color, opacity]);

  useEffect(() => {
    return () => {
      coreGeometry.dispose();
      coreMaterial.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
    };
  }, [coreGeometry, coreMaterial, glowGeometry, glowMaterial]);

  useFrame((_, delta) => {
    if (progressRef.current >= 1) return;

    progressRef.current = Math.min(progressRef.current + delta / DRAW_SPEED, 1);

    // Animate draw range on both tubes
    const coreCount = coreGeometry.index
      ? Math.floor(progressRef.current * coreGeometry.index.count)
      : 0;
    coreGeometry.setDrawRange(0, coreCount);

    const glowCount = glowGeometry.index
      ? Math.floor(progressRef.current * glowGeometry.index.count)
      : 0;
    glowGeometry.setDrawRange(0, glowCount);
  });

  return (
    <group>
      <mesh ref={coreRef} geometry={coreGeometry} material={coreMaterial} />
      <mesh ref={glowRef} geometry={glowGeometry} material={glowMaterial} />
    </group>
  );
}

export const ArcLine = memo(ArcLineComponent);

import { useRef, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { centroidToCameraPosition } from "../utils/geoHelpers";

interface FlyToState {
  active: boolean;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  startLookAt: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  progress: number;
  duration: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function useCameraFlyTo() {
  const { camera } = useThree();
  const state = useRef<FlyToState>({
    active: false,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startLookAt: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3(),
    progress: 0,
    duration: 1.8,
  });

  useFrame((_, delta) => {
    const s = state.current;
    if (!s.active) return;

    s.progress += delta / s.duration;
    const t = Math.min(s.progress, 1);
    const eased = easeInOutCubic(t);

    camera.position.lerpVectors(s.startPos, s.targetPos, eased);

    const lookAt = new THREE.Vector3().lerpVectors(
      s.startLookAt,
      s.targetLookAt,
      eased
    );
    camera.lookAt(lookAt);

    if (t >= 1) {
      s.active = false;
    }
  });

  const flyTo = useCallback(
    (lat: number, lng: number) => {
      const targetPos = centroidToCameraPosition(lat, lng, 4.5);
      const targetLookAt = new THREE.Vector3(0, 0, 0);

      const s = state.current;
      s.startPos.copy(camera.position);
      s.targetPos.copy(targetPos);
      s.startLookAt.set(0, 0, 0);
      s.targetLookAt.copy(targetLookAt);
      s.progress = 0;
      s.active = true;
    },
    [camera]
  );

  const resetCamera = useCallback(() => {
    const s = state.current;
    s.startPos.copy(camera.position);
    s.targetPos.set(0, 0, 6);
    s.startLookAt.set(0, 0, 0);
    s.targetLookAt.set(0, 0, 0);
    s.progress = 0;
    s.active = true;
  }, [camera]);

  return { flyTo, resetCamera, isAnimating: state.current.active };
}

import { useRef, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { centroidToCameraPosition } from "../utils/geoHelpers";
import { useGlobeStore } from "../store/globeStore";

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
  const { camera, gl } = useThree();
  const state = useRef<FlyToState>({
    active: false,
    startPos: new THREE.Vector3(),
    targetPos: new THREE.Vector3(),
    startLookAt: new THREE.Vector3(),
    targetLookAt: new THREE.Vector3(),
    progress: 0,
    duration: 1.8,
  });
  const savedPos = useRef(new THREE.Vector3(0, 0, 6));

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
      useGlobeStore.getState().setCameraAnimating(false);
    }
  });

  const flyTo = useCallback(
    (
      lat: number,
      lng: number,
      options?: { panelOffsetPx?: number; globeRotationY?: number }
    ) => {
      // Save current position so we can return here on reset
      savedPos.current.copy(camera.position);

      const targetPos = centroidToCameraPosition(lat, lng, 4.5);

      // The globe group has rotated, so the country's actual world position
      // is the lat/lng position rotated by globeRotationY
      if (options?.globeRotationY) {
        targetPos.applyEuler(new THREE.Euler(0, options.globeRotationY, 0));
      }

      const targetLookAt = new THREE.Vector3(0, 0, 0);

      // Shift camera sideways so globe centers in the free area beside the panel
      if (options?.panelOffsetPx) {
        const cam = camera as THREE.PerspectiveCamera;
        const dist = targetPos.length();
        const vFov = (cam.fov * Math.PI) / 180;
        const visibleHeight = 2 * dist * Math.tan(vFov / 2);
        const worldPerPx = visibleHeight / gl.domElement.clientHeight;
        const shiftWorld = (options.panelOffsetPx / 2) * worldPerPx;

        const forward = targetLookAt.clone().sub(targetPos).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3()
          .crossVectors(forward, up)
          .normalize();

        targetPos.add(right.multiplyScalar(shiftWorld));
      }

      const s = state.current;
      s.startPos.copy(camera.position);
      s.targetPos.copy(targetPos);
      s.startLookAt.set(0, 0, 0);
      s.targetLookAt.copy(targetLookAt);
      s.progress = 0;
      s.active = true;
      useGlobeStore.getState().setCameraAnimating(true);
    },
    [camera, gl]
  );

  const resetCamera = useCallback(() => {
    const s = state.current;
    s.startPos.copy(camera.position);
    s.targetPos.copy(savedPos.current);
    s.startLookAt.set(0, 0, 0);
    s.targetLookAt.set(0, 0, 0);
    s.progress = 0;
    s.active = true;
    useGlobeStore.getState().setCameraAnimating(true);
  }, [camera]);

  return { flyTo, resetCamera };
}

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const DEFAULT_GLOBE_RADIUS = 2;
const DEFAULT_EPSILON = 0.005;

export function useGlobeVisibility(
  targetRef: RefObject<THREE.Object3D | null>,
  globeRadius: number = DEFAULT_GLOBE_RADIUS,
  epsilon: number = DEFAULT_EPSILON
) {
  const { camera } = useThree();
  const [isVisible, setIsVisible] = useState(true);
  const visibleRef = useRef(true);
  const worldPosition = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Ray(), []);
  const globeSphere = useMemo(
    () => new THREE.Sphere(new THREE.Vector3(0, 0, 0), globeRadius),
    [globeRadius]
  );

  useFrame(() => {
    const target = targetRef.current;
    if (!target) return;

    target.getWorldPosition(worldPosition);
    direction.subVectors(worldPosition, camera.position);

    const targetDistance = direction.length();
    if (targetDistance === 0) return;

    direction.divideScalar(targetDistance);
    ray.set(camera.position, direction);

    const hit = ray.intersectSphere(globeSphere, hitPoint);
    const hitDistance = hit ? camera.position.distanceTo(hitPoint) : Infinity;
    const nextVisible = hitDistance >= targetDistance - epsilon;

    if (visibleRef.current !== nextVisible) {
      visibleRef.current = nextVisible;
      setIsVisible(nextVisible);
    }
  });

  return isVisible;
}

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGlobeStore } from "../../store/globeStore";
import { getCountryByCode } from "../../utils/countryData";
import { latLngToVector3 } from "../../utils/geoHelpers";

export function CountryOverlay() {
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const ringRef = useRef<THREE.Mesh>(null);

  const countryInfo = useMemo(
    () => (selectedCountry ? getCountryByCode(selectedCountry) : null),
    [selectedCountry]
  );

  const position = useMemo(() => {
    if (!countryInfo) return new THREE.Vector3(0, 0, 0);
    return latLngToVector3(countryInfo.lat, countryInfo.lng, 2.02);
  }, [countryInfo]);

  const quaternion = useMemo(() => {
    if (!countryInfo) return new THREE.Quaternion();
    const normal = position.clone().normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [countryInfo, position]);

  useFrame(({ clock }) => {
    if (ringRef.current && selectedCountry) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.05;
      ringRef.current.scale.setScalar(scale);
    }
  });

  if (!selectedCountry || !countryInfo) return null;

  return (
    <mesh
      ref={ringRef}
      position={position}
      quaternion={quaternion}
    >
      <ringGeometry args={[0.12, 0.15, 32]} />
      <meshBasicMaterial
        color="#14b8a6"
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

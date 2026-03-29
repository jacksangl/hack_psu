import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { useCameraFlyTo } from "../../../hooks/useCameraFlyTo";

// Must match CountryPanel's max-w-md (448px)
const PANEL_WIDTH = 448;

interface CameraControllerProps {
  globeGroupRef: React.RefObject<THREE.Group>;
}

export function CameraController({ globeGroupRef }: CameraControllerProps) {
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const { flyTo, resetCamera } = useCameraFlyTo();
  const prevCountry = useRef<string | null>(null);

  useEffect(() => {
    if (selectedCountry && selectedCountry !== prevCountry.current) {
      const info = getCountryByCode(selectedCountry);
      if (info) {
        const rotY = globeGroupRef.current?.rotation.y ?? 0;
        flyTo(info.lat, info.lng, {
          panelOffsetPx: PANEL_WIDTH,
          globeRotationY: rotY,
        });
      }
    } else if (!selectedCountry && prevCountry.current) {
      resetCamera();
    }
    prevCountry.current = selectedCountry;
  }, [selectedCountry, flyTo, resetCamera, globeGroupRef]);

  return null;
}

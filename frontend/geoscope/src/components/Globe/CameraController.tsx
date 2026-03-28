import { useEffect, useRef } from "react";
import { useGlobeStore } from "../../store/globeStore";
import { getCountryByCode } from "../../utils/countryData";
import { useCameraFlyTo } from "../../hooks/useCameraFlyTo";

export function CameraController() {
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const { flyTo, resetCamera } = useCameraFlyTo();
  const prevCountry = useRef<string | null>(null);

  useEffect(() => {
    if (selectedCountry && selectedCountry !== prevCountry.current) {
      const info = getCountryByCode(selectedCountry);
      if (info) {
        flyTo(info.lat, info.lng);
      }
    } else if (!selectedCountry && prevCountry.current) {
      resetCamera();
    }
    prevCountry.current = selectedCountry;
  }, [selectedCountry, flyTo, resetCamera]);

  return null;
}

import { Html } from "@react-three/drei";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useCountryVisualHeatData } from "../../../data/news/hooks/useCountryVisualHeatData";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { latLngToVector3 } from "../../../utils/geoHelpers";
import { heatToHex } from "../../../utils/heatmapColors";
import { useGlobeVisibility } from "../../hooks/useGlobeVisibility";

interface CountryFlagMarkerProps {
  countryCode: string;
  lat: number;
  lng: number;
  flag: string;
  name: string;
  heat: number;
}

const CountryFlagMarker = memo(function CountryFlagMarker({
  countryCode,
  lat,
  lng,
  flag,
  name,
  heat,
}: CountryFlagMarkerProps) {
  const selectCountry = useGlobeStore((s) => s.selectCountry);
  const clearSelectedCountry = useGlobeStore((s) => s.clearSelectedCountry);
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const groupRef = useRef<THREE.Group>(null);
  const isVisible = useGlobeVisibility(groupRef);
  const [hovered, setHovered] = useState(false);

  const position = useMemo(
    () => latLngToVector3(lat, lng, 2.012),
    [lat, lng]
  );

  const quaternion = useMemo(() => {
    const normal = position.clone().normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [position]);

  const isSelected = selectedCountry === countryCode;
  const accentColor = useMemo(() => heatToHex(heat), [heat]);
  const borderColor = useMemo(() => {
    return new THREE.Color(accentColor)
      .lerp(new THREE.Color("#f8fafc"), isSelected ? 0.28 : 0.12)
      .getStyle();
  }, [accentColor, isSelected]);
  const glowColor = useMemo(() => {
    return new THREE.Color(accentColor)
      .lerp(new THREE.Color("#ffffff"), 0.12)
      .getStyle();
  }, [accentColor]);

  useEffect(() => {
    if (!isVisible) {
      setHovered(false);
      document.body.style.cursor = "default";
    }
  }, [isVisible]);

  return (
    <group
      ref={groupRef}
      position={position}
      quaternion={quaternion}
    >
      {isVisible && (
        <>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 0.09, 6]} />
            <meshBasicMaterial
              color={accentColor}
              transparent
              opacity={0.82}
            />
          </mesh>

          <mesh position={[0, 0.092, 0]}>
            <sphereGeometry args={[0.009, 8, 8]} />
            <meshBasicMaterial color={accentColor} />
          </mesh>

          <Html
            position={[0, 0.145, 0]}
            center
            distanceFactor={7}
            style={{ pointerEvents: "auto" }}
            zIndexRange={[14, 0]}
          >
            <button
              type="button"
              title={name}
              aria-label={name}
              onPointerOver={() => {
                setHovered(true);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHovered(false);
                document.body.style.cursor = "default";
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (selectedCountry === countryCode) {
                  clearSelectedCountry();
                } else {
                  selectCountry(countryCode);
                }
              }}
              className={`
                flex items-center justify-center
                min-w-8 h-8 px-1.5 rounded-md border
                bg-slate-950/80 backdrop-blur-sm
                shadow-[0_10px_28px_rgba(2,6,23,0.35)]
                transition-all duration-200
                select-none
                ${isSelected ? "scale-110 -translate-y-0.5" : ""}
                ${!isSelected && hovered ? "scale-105 -translate-y-0.5" : ""}
              `}
              style={{
                borderColor,
                boxShadow: isSelected
                  ? `0 0 0 1px rgba(248,250,252,0.2), 0 10px 26px ${glowColor}`
                  : undefined,
              }}
            >
              <span
                aria-hidden="true"
                style={{ fontSize: "16px", lineHeight: 1 }}
              >
                {flag}
              </span>
            </button>
          </Html>
        </>
      )}
    </group>
  );
});

export function CountryFlagMarkers() {
  const heatData = useCountryVisualHeatData();

  const markers = useMemo(() => {
    return Object.entries(heatData)
      .map(([countryCode, entry]) => {
        const country = getCountryByCode(countryCode);
        if (!country || !entry.hasNews || entry.sourceCount === 0) return null;

        return {
          key: countryCode,
          countryCode,
          lat: country.lat,
          lng: country.lng,
          flag: country.flag,
          name: country.name,
          heat: entry.heat,
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const a = left as NonNullable<typeof left>;
        const b = right as NonNullable<typeof right>;
        return b.heat - a.heat || a.countryCode.localeCompare(b.countryCode);
      }) as Array<{
      key: string;
      countryCode: string;
      lat: number;
      lng: number;
      flag: string;
      name: string;
      heat: number;
    }>;
  }, [heatData]);

  return (
    <group>
      {markers.map((marker) => (
        <CountryFlagMarker
          key={marker.key}
          countryCode={marker.countryCode}
          lat={marker.lat}
          lng={marker.lng}
          flag={marker.flag}
          name={marker.name}
          heat={marker.heat}
        />
      ))}
    </group>
  );
}

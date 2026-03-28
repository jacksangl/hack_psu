import { useMemo } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useGlobeStore } from "../../store/globeStore";
import { COUNTRIES } from "../../utils/countryData";
import { latLngToVector3 } from "../../utils/geoHelpers";

function FlagMarker({
  code,
  flag,
  name,
  lat,
  lng,
}: {
  code: string;
  flag: string;
  name: string;
  lat: number;
  lng: number;
}) {
  const selectCountry = useGlobeStore((s) => s.selectCountry);
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);

  const position = useMemo(
    () => latLngToVector3(lat, lng, 2.02),
    [lat, lng]
  );

  const isSelected = selectedCountry === code;

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={6}
        style={{ pointerEvents: "auto" }}
        zIndexRange={[10, 0]}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            selectCountry(code);
          }}
          title={name}
          className={`
            flex items-center justify-center
            w-7 h-7 rounded-full
            backdrop-blur-sm
            transition-all duration-200
            cursor-pointer select-none
            ${
              isSelected
                ? "bg-slate-800/90 scale-125 ring-2 ring-teal-400/60"
                : "bg-slate-900/60 hover:bg-slate-800/80 hover:scale-110"
            }
          `}
          style={{ fontSize: "14px", lineHeight: 1 }}
        >
          {flag}
        </button>
      </Html>
    </group>
  );
}

export function CountryFlags() {
  return (
    <group>
      {COUNTRIES.map((c) => (
        <FlagMarker
          key={c.code}
          code={c.code}
          flag={c.flag}
          name={c.name}
          lat={c.lat}
          lng={c.lng}
        />
      ))}
    </group>
  );
}

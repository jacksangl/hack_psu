import { useMemo, memo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { latLngToVector3 } from "../../../utils/geoHelpers";
import { sentimentToHex, type Sentiment } from "../../../utils/sentimentColors";
import { useGlobeVisibility } from "../../hooks/useGlobeVisibility";

const SentimentDot = memo(function SentimentDot({
  lat,
  lng,
  sentiment,
  countryCode,
}: {
  lat: number;
  lng: number;
  sentiment: Sentiment;
  countryCode: string;
}) {
  const selectCountry = useGlobeStore((s) => s.selectCountry);
  const clearSelectedCountry = useGlobeStore((s) => s.clearSelectedCountry);
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const groupRef = useRef<THREE.Group>(null);
  const isVisible = useGlobeVisibility(groupRef);
  const position = useMemo(() => latLngToVector3(lat, lng, 2.005), [lat, lng]);
  const quaternion = useMemo(() => {
    const normal = position.clone().normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [position]);

  const color = sentimentToHex(sentiment);

  useEffect(() => {
    if (!isVisible) {
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
          <mesh
            onClick={(e) => {
              if (e.delta > 4) return;
              e.stopPropagation();
              if (selectedCountry === countryCode) {
                clearSelectedCountry();
              } else {
                selectCountry(countryCode);
              }
            }}
            onPointerOver={() => {
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "default";
            }}
          >
            <circleGeometry args={[0.06, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.35}
              side={THREE.FrontSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </>
      )}
    </group>
  );
});

export function SentimentOverlay() {
  const globalSentiment = useGlobeStore((s) => s.globalSentiment);

  const dots = useMemo(() => {
    const entries = Object.values(globalSentiment);
    return entries
      .map((entry) => {
        const country = getCountryByCode(entry.countryCode);
        if (!country) return null;
        return {
          key: entry.countryCode,
          lat: country.lat,
          lng: country.lng,
          sentiment: entry.sentiment,
        };
      })
      .filter(Boolean) as {
      key: string;
      lat: number;
      lng: number;
      sentiment: Sentiment;
    }[];
  }, [globalSentiment]);

  return (
    <group>
      {dots.map((dot) => (
        <SentimentDot
          key={dot.key}
          countryCode={dot.key}
          lat={dot.lat}
          lng={dot.lng}
          sentiment={dot.sentiment}
        />
      ))}
    </group>
  );
}

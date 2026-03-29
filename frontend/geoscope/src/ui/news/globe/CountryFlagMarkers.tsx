import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useCountryVisualHeatData } from "../../../data/news/hooks/useCountryVisualHeatData";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { latLngToVector3 } from "../../../utils/geoHelpers";
import { heatToHex } from "../../../utils/heatmapColors";
import { useGlobeVisibility } from "../../hooks/useGlobeVisibility";

const FLAG_REFERENCE_CAMERA_DISTANCE = 6;
const FLAG_MIN_SCALE = 0.38;
const FLAG_MAX_SCALE = 1.08;
const FLAG_SCALE_CURVE = 1.24;
const FLAG_BASE_SIZE_PX = 32;
const FLAG_BASE_FONT_SIZE_PX = 16;
const FLAG_BASE_PADDING_X_PX = 6;

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
  const contentRef = useRef<THREE.Group>(null);
  const isVisible = useGlobeVisibility(groupRef);
  const [hovered, setHovered] = useState(false);
  const [htmlScale, setHtmlScale] = useState(1);
  const htmlScaleRef = useRef(1);

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

  useFrame((state) => {
    if (!contentRef.current) return;

    const cameraDistance = state.camera.position.length();
    const zoomScale = THREE.MathUtils.clamp(
      Math.pow(
        cameraDistance / FLAG_REFERENCE_CAMERA_DISTANCE,
        FLAG_SCALE_CURVE
      ),
      FLAG_MIN_SCALE,
      FLAG_MAX_SCALE
    );

    const currentScale = contentRef.current.scale.x;
    if (Math.abs(currentScale - zoomScale) < 0.001) return;

    const nextScale = THREE.MathUtils.lerp(currentScale, zoomScale, 0.14);
    contentRef.current.scale.setScalar(nextScale);

    if (Math.abs(htmlScaleRef.current - nextScale) > 0.01) {
      htmlScaleRef.current = nextScale;
      setHtmlScale(nextScale);
    }
  });

  const interactionScale = isSelected ? 1.1 : hovered ? 1.05 : 1;
  const interactionLift = (isSelected || hovered ? -2 : 0) * htmlScale;
  const badgeSizePx = FLAG_BASE_SIZE_PX * htmlScale;
  const badgePaddingXPx = FLAG_BASE_PADDING_X_PX * htmlScale;
  const badgeFontSizePx = FLAG_BASE_FONT_SIZE_PX * htmlScale;

  return (
    <group
      ref={groupRef}
      position={position}
      quaternion={quaternion}
    >
      {isVisible && (
        <group ref={contentRef}>
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
                rounded-md border
                bg-slate-950/80 backdrop-blur-sm
                shadow-[0_10px_28px_rgba(2,6,23,0.35)]
                transition-all duration-200
                select-none
              `}
              style={{
                borderColor,
                boxShadow: isSelected
                  ? `0 0 0 1px rgba(248,250,252,0.2), 0 10px 26px ${glowColor}`
                  : undefined,
                minWidth: `${badgeSizePx}px`,
                height: `${badgeSizePx}px`,
                paddingLeft: `${badgePaddingXPx}px`,
                paddingRight: `${badgePaddingXPx}px`,
                transform: `translateY(${interactionLift}px) scale(${interactionScale})`,
                transformOrigin: "center center",
              }}
            >
              <span
                aria-hidden="true"
                style={{ fontSize: `${badgeFontSizePx}px`, lineHeight: 1 }}
              >
                {flag}
              </span>
            </button>
          </Html>
        </group>
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

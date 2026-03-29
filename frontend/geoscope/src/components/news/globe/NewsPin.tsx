import { useRef, useState, useMemo, memo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "../../../utils/geoHelpers";
import { sentimentToHex, type Sentiment } from "../../../utils/sentimentColors";
import { Html } from "@react-three/drei";
import { useGlobeVisibility } from "../../../hooks/useGlobeVisibility";

interface NewsPinProps {
  lat: number;
  lng: number;
  sentiment: Sentiment;
  title: string;
  url: string;
  count?: number;
}

function NewsPinComponent({
  lat,
  lng,
  sentiment,
  title,
  url,
  count,
}: NewsPinProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const targetScale = useRef(1);
  const isVisible = useGlobeVisibility(groupRef);

  const position = useMemo(
    () => latLngToVector3(lat, lng, 2.01),
    [lat, lng]
  );

  const quaternion = useMemo(() => {
    const normal = position.clone().normalize();
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return q;
  }, [position]);

  const color = sentimentToHex(sentiment);

  useEffect(() => {
    if (isVisible) return;
    setHovered(false);
    document.body.style.cursor = "default";
  }, [isVisible]);

  useFrame(() => {
    if (!groupRef.current) return;
    targetScale.current = hovered ? 1.3 : 1;
    const s = groupRef.current.scale.x;
    if (Math.abs(s - targetScale.current) < 0.001) return;
    const next = THREE.MathUtils.lerp(s, targetScale.current, 0.15);
    groupRef.current.scale.setScalar(next);
  });

  const handleClick = () => {
    setHovered(false);
    document.body.style.cursor = "default";
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <group
      ref={groupRef}
      position={position}
      quaternion={quaternion}
    >
      {isVisible && (
        <group>
          {/* Pin stem */}
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 0.06, 6]} />
            <meshBasicMaterial color={color} />
          </mesh>

          {/* Pin head */}
          <mesh
            position={[0, 0.07, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHovered(true);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              setHovered(false);
              document.body.style.cursor = "default";
            }}
            onClick={(e) => {
              if (e.delta > 4) return;
              e.stopPropagation();
              handleClick();
            }}
          >
            <sphereGeometry args={[0.015, 8, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>

          {/* Glow */}
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.25}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Cluster count badge */}
          {count && count > 1 && (
            <Html
              position={[0, 0.1, 0]}
              center
              style={{ pointerEvents: "none" }}
            >
              <div
                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: color, whiteSpace: "nowrap" }}
              >
                {count}
              </div>
            </Html>
          )}

          {/* Tooltip */}
          {hovered && (
            <Html
              position={[0, 0.13, 0]}
              center
              style={{ pointerEvents: "none" }}
            >
              <div className="glass-panel px-3 py-2 max-w-[220px] text-xs text-slate-200 whitespace-normal">
                {title}
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
}

export const NewsPin = memo(NewsPinComponent);

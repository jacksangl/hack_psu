import { useMemo, memo, useCallback } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "../../../utils/geoHelpers";
import { sentimentToHex, type Sentiment } from "../../../utils/sentimentColors";
import { useGlobeStore } from "../../../store/globeStore";

interface NewsPinProps {
  lat: number;
  lng: number;
  sentiment: Sentiment;
  title: string;
  url: string;
  source?: string;
}

function NewsPinComponent({
  lat,
  lng,
  sentiment,
  title,
  url,
  source,
}: NewsPinProps) {
  const setHoveredCountry = useGlobeStore((state) => state.setHoveredCountry);
  const setHoveredStoryTitle = useGlobeStore(
    (state) => state.setHoveredStoryTitle
  );
  const setHoveredScreenPosition = useGlobeStore(
    (state) => state.setHoveredScreenPosition
  );
  const clearHoveredItem = useGlobeStore((state) => state.clearHoveredItem);

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

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      setHoveredCountry(null);
      setHoveredStoryTitle(title);
      setHoveredScreenPosition({
        x: event.nativeEvent.clientX,
        y: event.nativeEvent.clientY,
      });
      document.body.style.cursor = "pointer";
    },
    [setHoveredCountry, setHoveredScreenPosition, setHoveredStoryTitle, title]
  );

  const handlePointerOut = useCallback(() => {
    clearHoveredItem();
    document.body.style.cursor = "default";
  }, [clearHoveredItem]);

  const setPendingArticleNav = useGlobeStore(
    (state) => state.setPendingArticleNav
  );

  const handleClick = useCallback(() => {
    clearHoveredItem();
    document.body.style.cursor = "default";
    if (!url) return;
    setPendingArticleNav({ title, source: source || "", url });
  }, [clearHoveredItem, url, title, source, setPendingArticleNav]);

  return (
    <group
      position={position}
      quaternion={quaternion}
    >
      <group>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.06, 6]} />
          <meshBasicMaterial color={color} />
        </mesh>

        <mesh
          position={[0, 0.07, 0]}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={(event) => {
            if (event.delta > 4) return;
            event.stopPropagation();
            handleClick();
          }}
        >
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Larger invisible hit area for easier clicking */}
        <mesh
          position={[0, 0.07, 0]}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={(event) => {
            if (event.delta > 4) return;
            event.stopPropagation();
            handleClick();
          }}
        >
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial visible={false} />
        </mesh>

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
      </group>
    </group>
  );
}

export const NewsPin = memo(NewsPinComponent);

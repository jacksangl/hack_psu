import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import * as topojson from "topojson-client";
import type { Topology } from "topojson-specification";
import { NEWS_GLOBE_CONFIG } from "../../news/globe/globeConfig";
import {
  resolveFeatureCountryCode,
  type CountryFeature,
} from "../../news/globe/countryTopology";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { buildCountrySurfaceGeometry } from "./countrySurfaceGeometry";

const COUNTRY_HIT_RADIUS = 2.009;

interface CountryRegion {
  countryCode: string;
  geometry: THREE.BufferGeometry;
  name: string;
}

interface CountryInteractionLayerProps {
  notifyCountryInteraction: () => void;
}

function pointerPosition(event: ThreeEvent<PointerEvent>) {
  return {
    x: event.nativeEvent.clientX,
    y: event.nativeEvent.clientY,
  };
}

function isFrontFacing(
  point: THREE.Vector3,
  camera: THREE.Camera
) {
  const normal = point.clone().normalize();
  const viewDirection = camera.position.clone().sub(point).normalize();
  return normal.dot(viewDirection) > 0.01;
}

function CountryInteractionLayerComponent({
  notifyCountryInteraction,
}: CountryInteractionLayerProps) {
  const selectedCountry = useGlobeStore((state) => state.selectedCountry);
  const selectCountry = useGlobeStore((state) => state.selectCountry);
  const clearSelectedCountry = useGlobeStore((state) => state.clearSelectedCountry);
  const setHoveredCountry = useGlobeStore((state) => state.setHoveredCountry);
  const setHoveredStoryTitle = useGlobeStore(
    (state) => state.setHoveredStoryTitle
  );
  const setHoveredScreenPosition = useGlobeStore(
    (state) => state.setHoveredScreenPosition
  );
  const clearHoveredItem = useGlobeStore((state) => state.clearHoveredItem);

  const [topoData, setTopoData] = useState<Topology | null>(null);
  const pointerDownCountryRef = useRef<string | null>(null);

  useEffect(() => {
    fetch(NEWS_GLOBE_CONFIG.heatmap.topoUrl)
      .then((response) => response.json())
      .then((data: Topology) => setTopoData(data))
      .catch(() => {});
  }, []);

  const regions = useMemo<CountryRegion[]>(() => {
    if (!topoData) {
      return [];
    }

    const featureCollection = topojson.feature(
      topoData,
      topoData.objects.countries as any
    ) as unknown as { features: CountryFeature[] };

    return featureCollection.features
      .map((feature) => {
        const countryCode = resolveFeatureCountryCode(feature);
        if (!countryCode || !feature.geometry) {
          return null;
        }

        const geometry = buildCountrySurfaceGeometry(
          feature.geometry,
          COUNTRY_HIT_RADIUS
        );
        if (!geometry) {
          return null;
        }

        const countryName =
          getCountryByCode(countryCode)?.name
          ?? feature.properties?.name
          ?? countryCode;

        return {
          countryCode,
          geometry,
          name: countryName,
        } satisfies CountryRegion;
      })
      .filter((region): region is CountryRegion => region !== null);
  }, [topoData]);

  useEffect(() => {
    return () => {
      regions.forEach((region) => region.geometry.dispose());
    };
  }, [regions]);

  const hitMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      hitMaterial.dispose();
    };
  }, [hitMaterial]);

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>, region: CountryRegion) => {
      if (!isFrontFacing(event.point, event.camera)) {
        clearHoveredItem();
        document.body.style.cursor = "default";
        return;
      }

      event.stopPropagation();
      setHoveredStoryTitle(null);
      setHoveredCountry(region.name);
      setHoveredScreenPosition(pointerPosition(event));
      document.body.style.cursor = "pointer";
    },
    [clearHoveredItem, setHoveredCountry, setHoveredScreenPosition, setHoveredStoryTitle]
  );

  const handlePointerOut = useCallback(() => {
    pointerDownCountryRef.current = null;
    clearHoveredItem();
    document.body.style.cursor = "default";
  }, [clearHoveredItem]);

  const handlePointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>, region: CountryRegion) => {
      if (!isFrontFacing(event.point, event.camera)) {
        pointerDownCountryRef.current = null;
        return;
      }

      notifyCountryInteraction();
      pointerDownCountryRef.current = region.countryCode;
      event.stopPropagation();
    },
    [notifyCountryInteraction]
  );

  const handlePointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>, region: CountryRegion) => {
      if (!isFrontFacing(event.point, event.camera)) {
        pointerDownCountryRef.current = null;
        return;
      }

      event.stopPropagation();
      if (event.delta > 8 || pointerDownCountryRef.current !== region.countryCode) {
        pointerDownCountryRef.current = null;
        return;
      }

      notifyCountryInteraction();
      clearHoveredItem();
      document.body.style.cursor = "default";
      pointerDownCountryRef.current = null;

      if (selectedCountry === region.countryCode) {
        clearSelectedCountry();
      } else {
        selectCountry(region.countryCode);
      }
    },
    [
      clearHoveredItem,
      clearSelectedCountry,
      notifyCountryInteraction,
      selectCountry,
      selectedCountry,
    ]
  );

  if (regions.length === 0) {
    return null;
  }

  return (
    <group>
      {regions.map((region) => (
        <mesh
          key={region.countryCode}
          geometry={region.geometry}
          material={hitMaterial}
          onPointerMove={(event) => handlePointerMove(event, region)}
          onPointerDown={(event) => handlePointerDown(event, region)}
          onPointerUp={(event) => handlePointerUp(event, region)}
          onPointerOut={handlePointerOut}
          onClick={(event) => event.stopPropagation()}
        />
      ))}
    </group>
  );
}

export const CountryInteractionLayer = memo(CountryInteractionLayerComponent);

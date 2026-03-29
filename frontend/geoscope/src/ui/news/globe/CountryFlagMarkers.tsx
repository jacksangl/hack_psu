import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { useCountryVisualHeatData } from "../../../data/news/hooks/useCountryVisualHeatData";
import { selectVisibleCountries } from "../../../data/news/processing/selectVisibleCountries";
import { useGlobeStore } from "../../../store/globeStore";
import { getCountryByCode } from "../../../utils/countryData";
import { latLngToVector3 } from "../../../utils/geoHelpers";
import { heatToHex } from "../../../utils/heatmapColors";
import { NEWS_GLOBE_CONFIG } from "./globeConfig";

interface MarkerDatum {
  color: THREE.Color;
  countryCode: string;
  glowColor: THREE.Color;
  highlightColor: THREE.Color;
  lat: number;
  lng: number;
  name: string;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

const STEM_Y_OFFSET = 0.045;
const DOT_Y_OFFSET = 0.092;
const HIT_Y_OFFSET = 0.092;
const HIT_RADIUS = 0.03;
const HOVER_SCALE = 1.06;
const SELECTED_SCALE = 1.12;

const tempMatrix = new THREE.Matrix4();
const tempScale = new THREE.Vector3();
const tempPosition = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();

function pointerPosition(event: ThreeEvent<PointerEvent>) {
  return {
    x: event.nativeEvent.clientX,
    y: event.nativeEvent.clientY,
  };
}

function CountryFlagMarkersComponent() {
  const heatData = useCountryVisualHeatData();
  const selectedCountry = useGlobeStore((state) => state.selectedCountry);
  const hoveredCountry = useGlobeStore((state) => state.hoveredCountry);
  const selectCountry = useGlobeStore((state) => state.selectCountry);
  const clearSelectedCountry = useGlobeStore((state) => state.clearSelectedCountry);
  const setHoveredCountry = useGlobeStore((state) => state.setHoveredCountry);
  const setHoveredStoryTitle = useGlobeStore((state) => state.setHoveredStoryTitle);
  const setHoveredScreenPosition = useGlobeStore(
    (state) => state.setHoveredScreenPosition
  );
  const clearHoveredItem = useGlobeStore((state) => state.clearHoveredItem);

  const stemMeshRef = useRef<THREE.InstancedMesh>(null);
  const dotMeshRef = useRef<THREE.InstancedMesh>(null);
  const hitMeshRef = useRef<THREE.InstancedMesh>(null);
  const lastZoomScaleRef = useRef(0);

  const stemGeometry = useMemo(
    () =>
      new THREE.CylinderGeometry(0.003, 0.003, 0.09, 6).translate(
        0,
        STEM_Y_OFFSET,
        0
      ),
    []
  );
  const dotGeometry = useMemo(
    () => new THREE.SphereGeometry(0.009, 8, 8).translate(0, DOT_Y_OFFSET, 0),
    []
  );
  const hitGeometry = useMemo(
    () =>
      new THREE.SphereGeometry(HIT_RADIUS, 12, 12).translate(0, HIT_Y_OFFSET, 0),
    []
  );

  useEffect(() => {
    return () => {
      stemGeometry.dispose();
      dotGeometry.dispose();
      hitGeometry.dispose();
    };
  }, [dotGeometry, hitGeometry, stemGeometry]);

  const markers = useMemo(() => {
    return selectVisibleCountries(heatData, {
      limit: NEWS_GLOBE_CONFIG.visibleCountryLimit,
      selectedCountry,
    })
      .map((entry) => {
        const country = getCountryByCode(entry.countryCode);
        if (!country) {
          return null;
        }

        const position = latLngToVector3(country.lat, country.lng, 2.012);
        tempPosition.copy(position).normalize();
        tempQuaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          tempPosition
        );

        const color = new THREE.Color(heatToHex(entry.heat));

        return {
          countryCode: entry.countryCode,
          name: country.name,
          lat: country.lat,
          lng: country.lng,
          position: position.clone(),
          quaternion: tempQuaternion.clone(),
          color,
          highlightColor: color.clone().lerp(new THREE.Color("#f8fafc"), 0.22),
          glowColor: color.clone().lerp(new THREE.Color("#ffffff"), 0.12),
        } satisfies MarkerDatum;
      })
      .filter((marker): marker is MarkerDatum => marker !== null);
  }, [heatData, selectedCountry]);

  const syncInstances = useCallback(
    (baseScale: number) => {
      const stemMesh = stemMeshRef.current;
      const dotMesh = dotMeshRef.current;
      const hitMesh = hitMeshRef.current;
      if (!stemMesh || !dotMesh || !hitMesh) {
        return;
      }

      for (let index = 0; index < markers.length; index++) {
        const marker = markers[index];
        const interactionScale =
          marker.countryCode === selectedCountry
            ? SELECTED_SCALE
            : marker.countryCode === hoveredCountry
              ? HOVER_SCALE
              : 1;

        tempScale.setScalar(baseScale * interactionScale);
        tempMatrix.compose(marker.position, marker.quaternion, tempScale);
        stemMesh.setMatrixAt(index, tempMatrix);
        dotMesh.setMatrixAt(index, tempMatrix);

        tempScale.setScalar(baseScale * 1.35);
        tempMatrix.compose(marker.position, marker.quaternion, tempScale);
        hitMesh.setMatrixAt(index, tempMatrix);

        stemMesh.setColorAt(
          index,
          marker.countryCode === selectedCountry
            ? marker.highlightColor
            : marker.color
        );
        dotMesh.setColorAt(
          index,
          marker.countryCode === selectedCountry
            ? marker.glowColor
            : marker.color
        );
      }

      stemMesh.instanceMatrix.needsUpdate = true;
      dotMesh.instanceMatrix.needsUpdate = true;
      hitMesh.instanceMatrix.needsUpdate = true;

      if (stemMesh.instanceColor) {
        stemMesh.instanceColor.needsUpdate = true;
      }
      if (dotMesh.instanceColor) {
        dotMesh.instanceColor.needsUpdate = true;
      }
    },
    [hoveredCountry, markers, selectedCountry]
  );

  useLayoutEffect(() => {
    syncInstances(lastZoomScaleRef.current || 1);
  }, [syncInstances]);

  useFrame((state) => {
    const zoomScale = THREE.MathUtils.clamp(
      Math.pow(
        state.camera.position.length() /
          NEWS_GLOBE_CONFIG.flags.referenceCameraDistance,
        NEWS_GLOBE_CONFIG.flags.scaleCurve
      ),
      NEWS_GLOBE_CONFIG.flags.minScale,
      NEWS_GLOBE_CONFIG.flags.maxScale
    );

    if (Math.abs(lastZoomScaleRef.current - zoomScale) < 0.01) {
      return;
    }

    lastZoomScaleRef.current = zoomScale;
    syncInstances(zoomScale);
  });

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.instanceId == null) {
        return;
      }

      const marker = markers[event.instanceId];
      if (!marker) {
        return;
      }

      setHoveredStoryTitle(null);
      setHoveredCountry(marker.name);
      setHoveredScreenPosition(pointerPosition(event));
      document.body.style.cursor = "pointer";
    },
    [markers, setHoveredCountry, setHoveredScreenPosition, setHoveredStoryTitle]
  );

  const handlePointerOut = useCallback(() => {
    clearHoveredItem();
    document.body.style.cursor = "default";
  }, [clearHoveredItem]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (event.delta > 4 || event.instanceId == null) {
        return;
      }

      const marker = markers[event.instanceId];
      if (!marker) {
        return;
      }

      clearHoveredItem();
      document.body.style.cursor = "default";

      if (marker.countryCode === selectedCountry) {
        clearSelectedCountry();
      } else {
        selectCountry(marker.countryCode);
      }
    },
    [clearHoveredItem, clearSelectedCountry, markers, selectCountry, selectedCountry]
  );

  if (markers.length === 0) {
    return null;
  }

  return (
    <group>
      <instancedMesh
        ref={stemMeshRef}
        args={[stemGeometry, undefined, markers.length]}
        frustumCulled={false}
      >
        <meshBasicMaterial transparent opacity={0.82} />
      </instancedMesh>

      <instancedMesh
        ref={dotMeshRef}
        args={[dotGeometry, undefined, markers.length]}
        frustumCulled={false}
      >
        <meshBasicMaterial />
      </instancedMesh>

      <instancedMesh
        ref={hitMeshRef}
        args={[hitGeometry, undefined, markers.length]}
        frustumCulled={false}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

export const CountryFlagMarkers = memo(CountryFlagMarkersComponent);

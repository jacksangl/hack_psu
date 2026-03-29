import { Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { EarthMesh } from "./EarthMesh";
import { CountryOverlay } from "./CountryOverlay";
import { CountryBorders } from "./CountryBorders";
import { CameraController } from "./CameraController";
import { NewsGlobeLayers } from "../../news/globe/NewsGlobeLayers";
import { useGlobeStore } from "../../../store/globeStore";
import { COUNTRIES } from "../../../utils/countryData";
import { latLngToVector3 } from "../../../utils/geoHelpers";


const _raycaster = new THREE.Raycaster();

function GlobeContent() {
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const selectCountry = useGlobeStore((s) => s.selectCountry);
  const clearSelectedCountry = useGlobeStore((s) => s.clearSelectedCountry);
  const isCameraAnimating = useGlobeStore((s) => s.isCameraAnimating);
  const clearHoveredItem = useGlobeStore((s) => s.clearHoveredItem);
  const setIsInteracting = useGlobeStore((s) => s.setIsInteracting);

  const globeGroupRef = useRef<THREE.Group>(null);
  const earthMeshRef = useRef<THREE.Group>(null);
  const orbitingRef = useRef(false);
  const { camera } = useThree();

  useEffect(() => {
    if (isCameraAnimating) {
      setIsInteracting(true);
      return;
    }

    if (!orbitingRef.current) {
      setIsInteracting(false);
    }
  }, [isCameraAnimating, setIsInteracting]);

  useFrame(() => {
    if (!selectedCountry && globeGroupRef.current) {
      globeGroupRef.current.rotation.y += 0.0005;
    }
  });

  const handleGlobeClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!event.point) return;
      if (event.delta > 4) return;

      // Use raycaster to verify the click hit the globe mesh
      _raycaster.setFromCamera(event.pointer, camera);

      // Check if ray intersects with the earth mesh group
      if (!earthMeshRef.current) return;
      const intersects = _raycaster.intersectObject(earthMeshRef.current, true);
      if (intersects.length === 0) return; // Click did not hit the globe

      // Prevent farther intersections behind the globe from also receiving the click.
      event.stopPropagation();

      // Un-rotate the click point to match fixed lat/lng world space
      let point = event.point.clone();
      if (globeGroupRef.current) {
        const rotY = globeGroupRef.current.rotation.y;
        point.applyEuler(new THREE.Euler(0, -rotY, 0));
      }
      point.normalize();

      let closestCode: string | null = null;
      let closestDist = Infinity;

      for (const country of COUNTRIES) {
        const countryPos = latLngToVector3(
          country.lat,
          country.lng,
          1
        ).normalize();
        const dist = point.distanceTo(countryPos);
        if (dist < closestDist && dist < 0.12) {
          closestDist = dist;
          closestCode = country.code;
        }
      }

      if (closestCode) {
        if (closestCode === selectedCountry) {
          clearSelectedCountry();
        } else {
          selectCountry(closestCode);
        }
      } else {
        clearSelectedCountry();
      }

      clearHoveredItem();
    },
    [selectedCountry, selectCountry, clearSelectedCountry, clearHoveredItem, camera]
  );

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[-5, 3, 5]} intensity={1.5} />
      <directionalLight position={[5, -2, -5]} intensity={0.4} />

      <group
        ref={globeGroupRef}
        onClick={handleGlobeClick}
      >
        <EarthMesh ref={earthMeshRef} />
        <CountryBorders />
        <CountryOverlay />
        <NewsGlobeLayers />
      </group>

      <CameraController globeGroupRef={globeGroupRef} />

      {!isCameraAnimating && (
        <OrbitControls
          enableDamping
          dampingFactor={0.15}
          autoRotate={false}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI - 0.3}
          minDistance={2.5}
          maxDistance={10}
          enablePan={false}
          onStart={() => {
            orbitingRef.current = true;
            setIsInteracting(true);
          }}
          onEnd={() => {
            orbitingRef.current = false;
            if (!isCameraAnimating) {
              setIsInteracting(false);
            }
          }}
        />
      )}
    </>
  );
}

export function GlobeScene() {
  return (
    <div className="absolute inset-0 z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{
          alpha: true,
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
          powerPreference: "high-performance",
          precision: "lowp",
        }}
        frameloop="always"
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <GlobeContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

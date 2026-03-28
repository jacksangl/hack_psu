import { Suspense, useCallback, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { EarthMesh } from "./EarthMesh";
import { CountryOverlay } from "./CountryOverlay";
import { SentimentOverlay } from "./SentimentOverlay";
import { CountryBorders } from "./CountryBorders";
import { NewsPin } from "./NewsPin";
import { ArcLine } from "./ArcLine";
import { NewsHeatmap } from "./NewsHeatmap";
import { useGlobeStore } from "../../store/globeStore";
import { getCountryByCode, COUNTRIES } from "../../utils/countryData";
import { latLngToVector3 } from "../../utils/geoHelpers";
import { clusterPins, type PinData } from "../../utils/clusterPins";
import { CameraController } from "./CameraController";


const _raycaster = new THREE.Raycaster();

function GlobeContent() {
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const selectCountry = useGlobeStore((s) => s.selectCountry);
  const clearSelectedCountry = useGlobeStore((s) => s.clearSelectedCountry);
  const countryNews = useGlobeStore((s) => s.countryNews);
  const connectDotsMode = useGlobeStore((s) => s.connectDotsMode);
  const isCameraAnimating = useGlobeStore((s) => s.isCameraAnimating);

  const globeGroupRef = useRef<THREE.Group>(null);
  const earthMeshRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!selectedCountry && globeGroupRef.current) {
      globeGroupRef.current.rotation.y += 0.0005;
    }
  });

  const handleGlobeClick = useCallback(
    (event: THREE.Event & { point?: THREE.Vector3; ndc?: THREE.Vector2 }) => {
      const threeEvent = event as unknown as {
        point: THREE.Vector3;
        ndc: THREE.Vector2;
        stopPropagation: () => void;
      };
      if (!threeEvent.point || !threeEvent.ndc) return;

      // Use raycaster to verify the click hit the globe mesh
      _raycaster.setFromCamera(threeEvent.ndc, camera);

      // Check if ray intersects with the earth mesh group
      if (!earthMeshRef.current) return;
      const intersects = _raycaster.intersectObject(earthMeshRef.current, true);
      if (intersects.length === 0) return; // Click did not hit the globe

      // Un-rotate the click point to match fixed lat/lng world space
      let point = threeEvent.point.clone();
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
        if (dist < closestDist && dist < 0.25) {
          closestDist = dist;
          closestCode = country.code;
        }
      }

      if (closestCode) {
        selectCountry(closestCode);
      } else {
        clearSelectedCountry();
      }
    },
    [selectCountry, clearSelectedCountry, camera]
  );

  const pins = useMemo(() => {
    const allPins: PinData[] = [];
    const newsData = selectedCountry ? countryNews[selectedCountry] : null;
    if (newsData) {
      for (const article of newsData.articles) {
        allPins.push({
          id: article.id,
          title: article.title,
          lat: article.lat,
          lng: article.lng,
          sentiment: article.sentiment,
          url: article.url,
          source: article.source,
        });
      }
    }
    return clusterPins(allPins);
  }, [selectedCountry, countryNews]);

  const arcs = useMemo(() => {
    if (!connectDotsMode || !selectedCountry) return [];
    const newsData = countryNews[selectedCountry];
    if (!newsData) return [];

    const sourceCountry = getCountryByCode(selectedCountry);
    if (!sourceCountry) return [];

    const arcSet = new Set<string>();
    const arcList: {
      key: string;
      startLat: number;
      startLng: number;
      endLat: number;
      endLng: number;
    }[] = [];

    for (const article of newsData.articles) {
      for (const relCode of article.relatedCountries) {
        const arcKey = [selectedCountry, relCode].sort().join("-");
        if (arcSet.has(arcKey)) continue;
        arcSet.add(arcKey);

        const target = getCountryByCode(relCode);
        if (!target) continue;

        arcList.push({
          key: arcKey,
          startLat: sourceCountry.lat,
          startLng: sourceCountry.lng,
          endLat: target.lat,
          endLng: target.lng,
        });
      }
    }

    return arcList;
  }, [connectDotsMode, selectedCountry, countryNews]);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[-5, 3, 5]} intensity={1.5} />
      <directionalLight position={[5, -2, -5]} intensity={0.4} />

      <group
        ref={globeGroupRef}
        onClick={handleGlobeClick as unknown as React.MouseEventHandler}
      >
        <EarthMesh ref={earthMeshRef} />
        <CountryBorders />
        <NewsHeatmap />
        <SentimentOverlay />
        <CountryOverlay />

        {pins.map((cluster) => (
          <NewsPin
            key={cluster.id}
            lat={cluster.lat}
            lng={cluster.lng}
            sentiment={cluster.sentiment}
            title={
              cluster.count > 1
                ? `${cluster.count} stories in this area`
                : cluster.pins[0].title
            }
            url={cluster.count === 1 ? cluster.pins[0].url : ""}
            count={cluster.count}
          />
        ))}

        {arcs.map((arc) => (
          <ArcLine
            key={arc.key}
            startLat={arc.startLat}
            startLng={arc.startLng}
            endLat={arc.endLat}
            endLng={arc.endLng}
          />
        ))}
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
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
          powerPreference: "high-performance",
          precision: "lowp",
        }}
        frameloop="always"
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        style={{ background: "#030712" }}
      >
        <Suspense fallback={null}>
          <GlobeContent />
        </Suspense>
      </Canvas>
    </div>
  );
}

import { useMemo, memo } from "react";
import * as THREE from "three";
import { useGlobeStore } from "../../../store/globeStore";
import { COUNTRIES } from "../../../utils/countryData";
import { latLngToVector3 } from "../../../utils/geoHelpers";
import { heatToHex } from "../../../utils/heatmapColors";

function NewsHeatmapComponent() {
  const countryNews = useGlobeStore((s) => s.countryNews);

  // Calculate heat for each country
  const heatData = useMemo(() => {
    // Get max source count across all countries
    let maxSources = 0;
    const countryHeat: Record<string, { heat: number; sourceCount: number }> =
      {};

    for (const [countryCode, newsData] of Object.entries(countryNews)) {
      const sources = new Set(newsData.articles.map((a) => a.source));
      const sourceCount = sources.size;
      maxSources = Math.max(maxSources, sourceCount);
      countryHeat[countryCode] = { sourceCount, heat: 0 };
    }

    // Normalize heat to 0-1
    for (const [, data] of Object.entries(countryHeat)) {
      data.heat = maxSources > 0 ? data.sourceCount / maxSources : 0;
    }

    return countryHeat;
  }, [countryNews]);

  // Create rings for each country with news
  const rings = useMemo(() => {
    return COUNTRIES.map((country) => {
      const heat = heatData[country.code];
      if (!heat || heat.heat === 0) return null;

      const position = latLngToVector3(country.lat, country.lng, 2.01);
      const normal = position.clone().normalize();
      const q = new THREE.Quaternion();
      q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

      // Scale ring based on heat
      const baseRadius = 0.15;
      const innerRadius = baseRadius * 0.6;
      const outerRadius = baseRadius + heat.heat * 0.15;

      return {
        key: country.code,
        position: position.toArray(),
        quaternion: [q.x, q.y, q.z, q.w],
        innerRadius,
        outerRadius,
        color: heatToHex(heat.heat),
        heat: heat.heat,
      };
    }).filter(Boolean) as Array<{
      key: string;
      position: [number, number, number];
      quaternion: [number, number, number, number];
      innerRadius: number;
      outerRadius: number;
      color: string;
      heat: number;
    }>;
  }, [heatData, countryNews]);

  return (
    <group>
      {rings.map((ring) => (
        <mesh
          key={ring.key}
          position={new THREE.Vector3(...ring.position)}
          quaternion={
            new THREE.Quaternion(
              ring.quaternion[0],
              ring.quaternion[1],
              ring.quaternion[2],
              ring.quaternion[3]
            )
          }
        >
          <ringGeometry
            args={[ring.innerRadius, ring.outerRadius, 16]}
          />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={0.4 + ring.heat * 0.35}
            side={THREE.FrontSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

export const NewsHeatmap = memo(NewsHeatmapComponent);

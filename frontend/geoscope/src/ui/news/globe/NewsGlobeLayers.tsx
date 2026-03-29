import { useNewsGlobeData } from "../../../data/news/hooks/useNewsGlobeData";
import { ArcLine } from "./ArcLine";
import { CountryFlagMarkers } from "./CountryFlagMarkers";
import { CountryHeatmap } from "./CountryHeatmap";
import { NewsPin } from "./NewsPin";

export function NewsGlobeLayers() {
  const { pins, arcs } = useNewsGlobeData();

  return (
    <>
      <CountryHeatmap />
      <CountryFlagMarkers />

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
          url={cluster.pins[0].url}
        />
      ))}

      {arcs.map((arc) => (
        <ArcLine
          key={arc.key}
          startLat={arc.startLat}
          startLng={arc.startLng}
          endLat={arc.endLat}
          endLng={arc.endLng}
          color={arc.color}
          opacity={arc.opacity}
        />
      ))}
    </>
  );
}

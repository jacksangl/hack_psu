import * as THREE from "three";
import type { Geometry, Polygon, Position } from "geojson";
import { latLngToVector3 } from "../../../utils/geoHelpers";

interface SphericalPoint {
  lat: number;
  lng: number;
}

interface RingData {
  planar: THREE.Vector2[];
  spherical: SphericalPoint[];
}

function stripClosedPoint(ring: Position[]) {
  if (ring.length < 2) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  const isClosed = first[0] === last[0] && first[1] === last[1];
  return isClosed ? ring.slice(0, -1) : ring;
}

function alignLongitude(lng: number, referenceLng: number) {
  let nextLng = lng;
  while (nextLng - referenceLng > 180) {
    nextLng -= 360;
  }
  while (nextLng - referenceLng < -180) {
    nextLng += 360;
  }
  return nextLng;
}

function averageLongitude(points: SphericalPoint[]) {
  if (points.length === 0) {
    return 0;
  }

  const total = points.reduce((sum, point) => sum + point.lng, 0);
  return total / points.length;
}

function unwrapRing(ring: Position[], referenceLng?: number) {
  const strippedRing = stripClosedPoint(ring);
  if (strippedRing.length < 3) {
    return [];
  }

  const spherical: SphericalPoint[] = [];

  strippedRing.forEach(([rawLng, lat], index) => {
    if (index === 0) {
      spherical.push({
        lat,
        lng:
          referenceLng == null
            ? rawLng
            : alignLongitude(rawLng, referenceLng),
      });
      return;
    }

    spherical.push({
      lat,
      lng: alignLongitude(rawLng, spherical[index - 1].lng),
    });
  });

  if (referenceLng != null) {
    const averageLng = averageLongitude(spherical);
    const adjustedAverage = alignLongitude(averageLng, referenceLng);
    const lngOffset = adjustedAverage - averageLng;

    if (lngOffset !== 0) {
      spherical.forEach((point) => {
        point.lng += lngOffset;
      });
    }
  }

  return spherical;
}

function orientRing(ring: RingData, clockwise: boolean) {
  const isClockwise = THREE.ShapeUtils.isClockWise(ring.planar);
  if (isClockwise === clockwise) {
    return ring;
  }

  ring.planar.reverse();
  ring.spherical.reverse();
  return ring;
}

function buildRingData(ring: Position[], referenceLng?: number): RingData | null {
  const spherical = unwrapRing(ring, referenceLng);
  if (spherical.length < 3) {
    return null;
  }

  return {
    planar: spherical.map((point) => new THREE.Vector2(point.lng, point.lat)),
    spherical,
  };
}

function projectPoint(point: SphericalPoint, radius: number) {
  return latLngToVector3(point.lat, point.lng, radius);
}

function appendTriangle(
  positions: number[],
  first: THREE.Vector3,
  second: THREE.Vector3,
  third: THREE.Vector3
) {
  const edgeA = second.clone().sub(first);
  const edgeB = third.clone().sub(first);
  const normal = edgeA.cross(edgeB);

  if (normal.dot(first) < 0) {
    positions.push(
      first.x,
      first.y,
      first.z,
      third.x,
      third.y,
      third.z,
      second.x,
      second.y,
      second.z
    );
    return;
  }

  positions.push(
    first.x,
    first.y,
    first.z,
    second.x,
    second.y,
    second.z,
    third.x,
    third.y,
    third.z
  );
}

function appendPolygonSurface(
  positions: number[],
  polygon: Polygon["coordinates"],
  radius: number
) {
  if (polygon.length === 0) {
    return;
  }

  const outerRing = buildRingData(polygon[0]);
  if (!outerRing) {
    return;
  }

  const referenceLng = averageLongitude(outerRing.spherical);
  orientRing(outerRing, true);

  const holes = polygon
    .slice(1)
    .map((ring) => buildRingData(ring, referenceLng))
    .filter((ring): ring is RingData => ring !== null)
    .map((ring) => orientRing(ring, false));

  const flattenedPoints = [
    ...outerRing.spherical,
    ...holes.flatMap((ring) => ring.spherical),
  ];

  const triangles = THREE.ShapeUtils.triangulateShape(
    outerRing.planar,
    holes.map((ring) => ring.planar)
  );

  for (const [indexA, indexB, indexC] of triangles) {
    const first = projectPoint(flattenedPoints[indexA], radius);
    const second = projectPoint(flattenedPoints[indexB], radius);
    const third = projectPoint(flattenedPoints[indexC], radius);
    appendTriangle(positions, first, second, third);
  }
}

export function buildCountrySurfaceGeometry(
  geometry: Geometry,
  radius: number
) {
  const positions: number[] = [];

  if (geometry.type === "Polygon") {
    appendPolygonSurface(positions, geometry.coordinates, radius);
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach((polygon) =>
      appendPolygonSurface(positions, polygon, radius)
    );
  }

  if (positions.length === 0) {
    return null;
  }

  const nextGeometry = new THREE.BufferGeometry();
  nextGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  nextGeometry.computeBoundingSphere();
  return nextGeometry;
}

import * as THREE from "three";

const DEG2RAD = Math.PI / 180;

export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = (90 - lat) * DEG2RAD;
  const theta = (lng + 180) * DEG2RAD;

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

export function centroidToCameraPosition(
  lat: number,
  lng: number,
  distance: number
): THREE.Vector3 {
  return latLngToVector3(lat, lng, distance);
}

export function greatCirclePoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  segments: number,
  radius: number = 2
): THREE.Vector3[] {
  const start = latLngToVector3(startLat, startLng, radius);
  const end = latLngToVector3(endLat, endLng, radius);
  const points: THREE.Vector3[] = [];

  const angle = start.angleTo(end);
  const arcHeight = Math.min(angle * 0.5, 0.6);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;

    const point = new THREE.Vector3().lerpVectors(start, end, t);
    point.normalize();

    const elevation = Math.sin(t * Math.PI) * arcHeight;
    point.multiplyScalar(radius + elevation);

    points.push(point);
  }

  return points;
}

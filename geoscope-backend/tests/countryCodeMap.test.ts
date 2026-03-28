import { describe, expect, it } from "vitest";

import { getCountryCentroid } from "../src/utils/countryCodeMap";

describe("getCountryCentroid", () => {
  it("returns centroid coverage beyond the original tracked country set", () => {
    const centroid = getCountryCentroid("MX");

    expect(centroid).not.toBeNull();
    expect(centroid?.locationName).toBe("Mexico");
    expect(centroid?.latitude).toBeCloseTo(23.634501);
    expect(centroid?.longitude).toBeCloseTo(-102.552784);
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceKm, polygonContains, trackLengthKm } from "./geo";

test("distanceKm is zero for identical points", () => {
  const p = { lat: 6.4, lng: 81.12 };
  assert.equal(distanceKm(p, p), 0);
});

test("distanceKm computes a plausible haversine distance (1 deg lat ~= 111 km)", () => {
  const d = distanceKm({ lat: 6.0, lng: 81.12 }, { lat: 7.0, lng: 81.12 });
  assert.ok(d > 110 && d < 112, `expected ~111, got ${d}`);
});

test("distanceKm is symmetric", () => {
  const a = { lat: 6.4, lng: 81.12 };
  const b = { lat: 6.42, lng: 81.15 };
  assert.ok(Math.abs(distanceKm(a, b) - distanceKm(b, a)) < 1e-9);
});

const square = {
  vertices: [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 10 },
    { lat: 10, lng: 10 },
    { lat: 10, lng: 0 },
  ],
};

test("polygonContains: point inside a square", () => {
  assert.equal(polygonContains(square, { lat: 5, lng: 5 }), true);
});

test("polygonContains: point outside", () => {
  assert.equal(polygonContains(square, { lat: 15, lng: 5 }), false);
});

test("polygonContains: empty polygon contains nothing", () => {
  assert.equal(polygonContains({ vertices: [] }, { lat: 5, lng: 5 }), false);
});

test("trackLengthKm of empty and single-point tracks is zero", () => {
  assert.equal(trackLengthKm([]), 0);
  assert.equal(trackLengthKm([{ lat: 6.4, lng: 81.12 }]), 0);
});

test("trackLengthKm sums consecutive legs", () => {
  const pts = [
    { lat: 6.0, lng: 81.12 },
    { lat: 6.5, lng: 81.12 },
  ];
  const d = trackLengthKm(pts);
  assert.ok(d > 50 && d < 60, `expected ~55.5 km, got ${d}`);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  clampCropOffset,
  getCoverScale,
  getCropSourceRect,
} from "../lib/utils/avatarCrop.mjs";

test("cover scale fills a square crop for portrait and landscape photos", () => {
  assert.equal(getCoverScale(1200, 800, 300), 0.375);
  assert.equal(getCoverScale(800, 1200, 300), 0.375);
  assert.equal(getCoverScale(600, 600, 300), 0.5);
});

test("drag offset is clamped so the crop never exposes an empty edge", () => {
  assert.deepEqual(clampCropOffset({ x: 999, y: -999 }, 1200, 800, 300, 1), { x: 75, y: 0 });
  assert.deepEqual(clampCropOffset({ x: 999, y: -999 }, 800, 1200, 300, 2), { x: 150, y: -300 });
});

test("source rectangle maps zoomed and repositioned viewport back to image pixels", () => {
  assert.deepEqual(
    getCropSourceRect({ imageWidth: 1200, imageHeight: 800, cropSize: 300, zoom: 1, offset: { x: 75, y: 0 } }),
    { x: 0, y: 0, width: 800, height: 800 },
  );
  assert.deepEqual(
    getCropSourceRect({ imageWidth: 800, imageHeight: 1200, cropSize: 300, zoom: 2, offset: { x: 0, y: -120 } }),
    { x: 200, y: 560, width: 400, height: 400 },
  );
});

test("invalid image dimensions and zoom are rejected", () => {
  assert.throws(() => getCoverScale(0, 800, 300), /positive/);
  assert.throws(() => getCropSourceRect({ imageWidth: 800, imageHeight: 800, cropSize: 300, zoom: 0, offset: { x: 0, y: 0 } }), /positive/);
});

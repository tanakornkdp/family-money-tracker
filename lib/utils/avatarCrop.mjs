function assertPositive(...values) {
  if (values.some(value => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError("Image dimensions, crop size, and zoom must be positive numbers.");
  }
}

export function getCoverScale(imageWidth, imageHeight, cropSize) {
  assertPositive(imageWidth, imageHeight, cropSize);
  return Math.max(cropSize / imageWidth, cropSize / imageHeight);
}

export function clampCropOffset(offset, imageWidth, imageHeight, cropSize, zoom) {
  assertPositive(imageWidth, imageHeight, cropSize, zoom);
  const scale = getCoverScale(imageWidth, imageHeight, cropSize) * zoom;
  const maxX = Math.max(0, (imageWidth * scale - cropSize) / 2);
  const maxY = Math.max(0, (imageHeight * scale - cropSize) / 2);
  return {
    x: maxX === 0 ? 0 : Math.max(-maxX, Math.min(maxX, offset.x)),
    y: maxY === 0 ? 0 : Math.max(-maxY, Math.min(maxY, offset.y)),
  };
}

export function getCropSourceRect({ imageWidth, imageHeight, cropSize, zoom, offset }) {
  assertPositive(imageWidth, imageHeight, cropSize, zoom);
  const scale = getCoverScale(imageWidth, imageHeight, cropSize) * zoom;
  const clamped = clampCropOffset(offset, imageWidth, imageHeight, cropSize, zoom);
  const size = cropSize / scale;
  return {
    x: imageWidth / 2 - size / 2 - clamped.x / scale,
    y: imageHeight / 2 - size / 2 - clamped.y / scale,
    width: size,
    height: size,
  };
}

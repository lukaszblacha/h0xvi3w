export function normalizeInt(value, minValue = 0, maxValue = 1) {
  return Math.max(minValue, Math.min(maxValue, value));
}

export function normalizeSelectionOffsets(offset1, offset2) {
  return [Math.min(offset1, offset2), Math.max(offset1, offset2)];
}

export function quantizeDown(num, step) {
  return Math.floor(num / step) * step;
}

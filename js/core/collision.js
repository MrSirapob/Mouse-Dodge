/** True if circles a and b overlap (a.x/a.y/a.r, b.x/b.y/b.r). */
export function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.r + b.r;
  return dx * dx + dy * dy < r * r;
}

/** Like circleHit, but with extra padding added to the combined radius (used for graze detection). */
export function circleNear(a, b, padding) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = a.r + b.r + padding;
  return dx * dx + dy * dy < r * r;
}

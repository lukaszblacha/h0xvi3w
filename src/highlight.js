export const range = ($node, start, end) => {
  const r = new Range();
  r.setStart($node, start);
  r.setEnd($node, end);
  return r;
}

export const highlight = (name, hls) => {
  const ranges = hls.map(([$node, start, end]) => {
    return range($node, start, end);
  })

  CSS.highlights.set(name, new Highlight(...ranges));
}

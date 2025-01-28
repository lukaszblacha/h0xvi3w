export const highlight = (name, hls) => {
  const ranges = hls.map(([$node, start, end]) => {
    const range = new Range();
    range.setStart($node, start);
    range.setEnd($node, end);
    return range;
  })

  CSS.highlights.set(name, new Highlight(...ranges));
}

export function range($node, start, end = start) {
  const r = new Range();
  r.setStart($node, start);
  r.setEnd($node, end);
  return r;
}

export function setCaret($node, offset) {
  setSelection($node, offset);
}

export function setSelection($node, startOffset, endOffset = startOffset) {
  const s = document.getSelection();
  s.removeAllRanges();
  s.addRange(range($node, startOffset, endOffset));
}

export function replaceInText($node, replacement, startOffset, endOffset = startOffset + replacement.length) {
  $node.data = $node.data.substring(0, startOffset)
    .concat(replacement)
    .concat($node.data.substring(endOffset));
}

export const highlight = (name, ranges) => {
  // Name corresponds to a highlight definition in CSS
  CSS.highlights.set(name, new Highlight(...ranges));
}

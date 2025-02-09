import { $, bindAll, debounce } from "../dom.js";
import { $panel } from "../components/panel.js";

export const $canvas = (editor) => {
  let afRid;

  const $offset = $.input({ type: "number", min: 0, step: 1, value: 0 });
  const $width = $.input({ type: "number", min: 2, step: 1, value: 100 });
  const $body = $.div({ class: "canvas-body" }, [$("canvas")]);

  const canvas = $body.querySelector("canvas");
  const ctx = canvas.getContext("2d");

  function render() {
    const width = parseInt($width.value);
    let offset = parseInt($offset.value);
    const unit = $body.clientWidth / width;

    canvas.setAttribute("width", unit * width);
    canvas.setAttribute("height", Math.ceil((editor.buffer.length - offset) / width) * unit);
    canvas.style.setProperty("max-width", `${20 * width}px`);
    ctx.clearRect(0, 0, canvas.scrollWidth, canvas.scrollHeight);
    let y = 0;
    while(offset < editor.buffer.length) {
      let line = Array.from(editor.buffer.subarray(offset, offset + width)).map(v => Math.round(v / 16).toString(16));
      line.forEach((s, i) => {
        ctx.fillStyle = `#${s}${s}${s}`;
        ctx.fillRect(i * unit, y, unit, unit);
      });
      y += unit;
      offset += width;
    }
  }

  const onChange = debounce(() => {
    cancelAnimationFrame(afRid);
    afRid = requestAnimationFrame(render);
  }, 100);

  function onPixelClick({ offsetX, offsetY, target }) {
    const width = parseInt($width.value);
    const unit = canvas.scrollWidth / width;
    const x = Math.floor(offsetX / unit);
    const y = Math.floor((offsetY + target.scrollTop) / unit);

    const index = x + y * width;
    if (index >= 0 && index < editor.buffer.length) {
      editor.setSelection(index, index + 1);
    }
  }

  function onSelect(e) {
    const { startOffset } = e.detail;
    const width = parseInt($width.value);
    const unit = Math.floor(canvas.scrollWidth / width);
    $body.scrollTop = Math.floor(startOffset / width) * unit;
  }

  bindAll(editor.buffer, { change: onChange });
  bindAll($offset, { change: onChange });
  bindAll($width, { change: onChange });
  bindAll($body, { click: onPixelClick });

  bindAll(editor, { select: onSelect });

  const { $element } = $panel({ class: "canvas", label: "Canvas" }, {
    body: [
      $.div({ class: "filters" }, ["Offset:", $offset, "Width:", $width]),
      $body
    ],
  });

  return {
    $element,
  };
}

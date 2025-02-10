import { $, bindAll, unbindAll, debounce } from "../dom.js";
import { Panel } from "../components/panel.js";
import { bindClassMethods } from "../utils/classes.js";

export class Canvas extends Panel {
  constructor(editor) {
    super({ class: "canvas", label: "Canvas" }, {
      body: [
        $.div({ class: "filters" }, [
          "Offset:",
          $.input({ type: "number", min: 0, step: 1, value: 0 }),
          "Width:",
          $.input({ type: "number", min: 2, step: 1, value: 100 })
        ]),
        $.div({ class: "canvas-body" }, [$("canvas")])
      ],
    });
    bindClassMethods(this);
    this.onChange = debounce(this.onChange, 200).bind(this);

    this.editor = editor;
    [this.$offset, this.$width] = this.$element.querySelectorAll("input");
    this.$body = this.$element.querySelector(".canvas-body");
    this.$canvas = this.$body.querySelector("canvas");
    this.ctx = this.$canvas.getContext("2d");
    this.resizeObserver = new ResizeObserver(this.onChange);

    const { $offset, $width, $body, onChange, onPixelClick, onSelect, resizeObserver } = this;

    bindAll(editor.buffer, { change: onChange });
    bindAll($offset, { change: onChange });
    bindAll($width, { change: onChange });
    bindAll($body, { click: onPixelClick });
    bindAll(editor, { select: onSelect });
    resizeObserver.observe($body);
  }

  destroy() {
    const { editor, $offset, $width, $body, onChange, onPixelClick, onSelect, resizeObserver } = this;
    unbindAll(editor.buffer, { change: onChange });
    unbindAll($offset, { change: onChange });
    unbindAll($width, { change: onChange });
    unbindAll($body, { click: onPixelClick });
    unbindAll(editor, { select: onSelect });
    resizeObserver.unobserve(this.$body);
  }

  render() {
    const { $width, $offset, $body, editor, $canvas, ctx } = this;
    const width = parseInt($width.value);
    let offset = parseInt($offset.value);
    const unit = Math.min(20, $body.clientWidth / width);

    $canvas.setAttribute("width", unit * width);
    $canvas.setAttribute("height", Math.ceil((editor.buffer.length - offset) / width) * unit);
    $canvas.style.setProperty("max-width", `${20 * width}px`);

    ctx.clearRect(0, 0, $canvas.scrollWidth, $canvas.scrollHeight);
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

  onChange() {
    cancelAnimationFrame(this.afRid);
    this.afRid = requestAnimationFrame(this.render);
  };

  onPixelClick({ offsetX, offsetY, target }) {
    const { $width, $offset, $canvas, editor } = this;
    const width = parseInt($width.value);
    const offset = parseInt($offset.value);
    const unit = $canvas.scrollWidth / width;
    const x = Math.floor(offsetX / unit);
    const y = Math.floor((offsetY + target.scrollTop) / unit);

    const index = x + y * width + offset;
    if (index >= 0 && index < editor.buffer.length) {
      editor.setSelection(index, index + 1);
    }
  }

  onSelect(e) {
    const { startOffset } = e.detail;
    const { $offset, $width, $canvas, $body } = this;
    const offset = parseInt($offset.value);
    const width = parseInt($width.value);
    const unit = Math.floor($canvas.scrollWidth / width);
    $body.scrollTop = Math.floor((startOffset - offset) / width) * unit;
  }
}

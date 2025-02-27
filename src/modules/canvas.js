import { $, bindAll, unbindAll, debounce } from "../dom.js";
import { Panel } from "../components/panel.js";

const defaults = {
  "width": "50",
  "offset": "0",
  "bpp": "1",
};

const avg = (arr) => arr.length < 1 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

const toChunks = (arr, size) => {
  if (size < 1) return [arr];
  let i = 0;
  const chunks = [];
  while (i < arr.length) {
    chunks.push(arr.slice(i, i + size));
    i += size;
  }
  return chunks;
}

export class Canvas extends Panel {
  static observedAttributes = ["width", "offset", "bpp"];

  constructor(editor) {
    super({ label: "Canvas" }, {
      body: $("div", { class: "canvas-body" }, [$("canvas")]),
      footer: [
        "offset:",
        $("input", { type: "number", name: "offset", min: 0 }),
        "width:",
        $("input", { type: "number", name: "width", min: 3 }),
        "bpp:",
        $("input", { type: "number", name: "bpp", min: 1 })
      ]
    });

    this.onChange = debounce(this.onChange.bind(this), 200);
    this.onPixelClick = this.onPixelClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.render = this.render.bind(this);

    this.editor = editor;
  }

  connectedCallback() {
    super.connectedCallback();
    this.$canvas = this.querySelector("canvas");
    this.ctx = this.$canvas.getContext("2d", { alpha: false });

    const [offsetInput, widthInput, bppInput] = this.querySelectorAll("input");
    offsetInput.value = this.offset;
    widthInput.value = this.width;
    bppInput.value = this.bpp;

    this.resizeObserver = new ResizeObserver(this.onChange);
    bindAll(this.editor.buffer, { change: this.onChange });
    bindAll(offsetInput, { change: this.handleInputChange });
    bindAll(widthInput, { change: this.handleInputChange });
    bindAll(bppInput, { change: this.handleInputChange });
    bindAll(this, { click: this.onPixelClick });
    this.resizeObserver.observe(this);
    this.render();
  }

  disconnectedCallback() {
    const [offsetInput, widthInput, bppInput] = this.querySelectorAll("input");
    unbindAll(this.editor.buffer, { change: this.onChange });
    unbindAll(offsetInput, { change: this.handleInputChange });
    unbindAll(widthInput, { change: this.handleInputChange });
    unbindAll(bppInput, { change: this.handleInputChange });
    unbindAll(this, { click: this.onPixelClick });
    this.resizeObserver.unobserve(this);
    this.resizeObserver = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    const [offsetInput, widthInput, bppInput] = this.querySelectorAll("input");
    switch (name) {
      case "width": {
        if (!newValue) return this.setAttribute(name, defaults[name]);
        widthInput.value = newValue;
        break;
      }
      case "offset": {
        if (!newValue) return this.setAttribute(name, defaults[name]);
        offsetInput.value = newValue;
        break;
      }
      case "bpp": {
        if (!newValue) return this.setAttribute(name, defaults[name]);
        bppInput.value = newValue;
        break;
      }
      default: return;
    }
    this.render();
  }

  get width() {
    return parseInt(this.getAttribute("width") ?? defaults["width"]);
  }

  get offset() {
    return parseInt(this.getAttribute("offset") ?? defaults["offset"]);
  }

  get bpp() {
    return parseInt(this.getAttribute("bpp") ?? defaults["bpp"]);
  }

  handleInputChange(e) {
    this.setAttribute(e.target.name, e.target.value);
  }

  render() {
    const { editor, $canvas, ctx, width, bpp } = this;
    const $body = this.querySelector(".canvas-body");
    const unit = Math.min(20, Math.max(1, Math.floor($body.clientWidth / width)));
    let offset = this.offset;

    $canvas.setAttribute("width", width * unit);
    $canvas.setAttribute("height", Math.ceil((editor.buffer.length - offset) / width) * unit);
    $canvas.style.setProperty("transform", `scale(${$body.clientWidth / (width * unit)})`);

    ctx.clearRect(0, 0, $canvas.scrollWidth, $canvas.scrollHeight);
    let y = 0;
    while(offset < editor.buffer.length) {
      const line = toChunks(Array.from(editor.buffer.subarray(offset, offset + width * bpp)), bpp)
        .map(avg)
        .map(v => v.toString(16).padStart(2, "0"));

      line.forEach((s, i) => {
        ctx.fillStyle = `#${s}${s}${s}`;
        ctx.fillRect(i * unit, y, unit, unit);
      });
      y += unit;
      offset += width * bpp;
    }
  }

  onChange() {
    cancelAnimationFrame(this.afRid);
    this.afRid = requestAnimationFrame(this.render);
  };

  onPixelClick({ offsetX, offsetY, target }) {
    const { $canvas, editor, width, offset, bpp } = this;
    const unit = $canvas.scrollWidth / width;
    const x = Math.floor(offsetX / unit);
    if (x > width) return;
    const y = Math.floor((offsetY + target.scrollTop) / unit);

    const index = (x + y * width) * bpp + offset;
    if (index >= 0 && index < editor.buffer.length) {
      editor.setSelection(index, index + bpp);
    }
  }
}
customElements.define("hv-canvas", Canvas);

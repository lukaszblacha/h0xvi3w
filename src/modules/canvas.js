import { $, bindAll, unbindAll, debounce, parseAttribute } from "../dom.js";
import { Panel } from "../components/panel.js";

const defaults = {
  "width": "50",
  "offset": "0",
  "bpp": "1",
  "scanline": "0",
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
  static observedAttributes = ["width", "offset", "bpp", "scanline"];

  constructor(editor) {
    super({ label: "Canvas", disposable: true }, {
      body: $("div", { class: "canvas-body" }, [$("canvas")]),
      header: $("div", { class: "panel-toolbar" }, [
        $("label", {}, [
          $("span", {}, ["Offset"]),
          $("input", { type: "number", name: "offset", min: 0, value: parseInt(defaults["offset"]) })
        ]),
        $("label", {}, [
          $("span", {}, ["Width"]),
          $("input", { type: "number", name: "width", min: 3, value: parseInt(defaults["width"]) }),
        ]),
        $("label", {}, [
          $("span", {}, ["Bytes/pixel"]),
          $("input", { type: "number", name: "bpp", min: 1, value: parseInt(defaults["bpp"]) }),
        ]),
        $("label", {}, [
          $("span", {}, ["Scanline offset"]),
          $("input", { type: "number", name: "scanline", min: 0, value: parseInt(defaults["scanline"]) })
        ]),
      ])
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

    const [offsetInput, widthInput, bppInput, scanlineInput] = this.querySelectorAll("input");
    offsetInput.value = this.offset;
    widthInput.value = this.width;
    bppInput.value = this.bpp;
    scanlineInput.value = this.scanline;

    this.resizeObserver = new ResizeObserver(this.onChange);
    bindAll(this.editor.buffer, { change: this.onChange });
    bindAll(offsetInput, { change: this.handleInputChange });
    bindAll(widthInput, { change: this.handleInputChange });
    bindAll(bppInput, { change: this.handleInputChange });
    bindAll(scanlineInput, { change: this.handleInputChange });
    bindAll(this, { click: this.onPixelClick });
    this.resizeObserver.observe(this);
    this.render();
  }

  disconnectedCallback() {
    const [offsetInput, widthInput, bppInput, scanlineInput] = this.querySelectorAll("input");
    unbindAll(this.editor.buffer, { change: this.onChange });
    unbindAll(offsetInput, { change: this.handleInputChange });
    unbindAll(widthInput, { change: this.handleInputChange });
    unbindAll(bppInput, { change: this.handleInputChange });
    unbindAll(scanlineInput, { change: this.handleInputChange });
    unbindAll(this, { click: this.onPixelClick });
    this.resizeObserver.unobserve(this);
    this.resizeObserver = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    const [offsetInput, widthInput, bppInput, scanlineInput] = this.querySelectorAll("input");

    if (!newValue) return this.setAttribute(name, defaults[name]);

    switch (name) {
      case "width": {
        widthInput.value = newValue;
        break;
      }
      case "offset": {
        offsetInput.value = newValue;
        break;
      }
      case "bpp": {
        bppInput.value = newValue;
        break;
      }
      case "scanline": {
        scanlineInput.value = newValue;
        break;
      }
      default: return;
    }
    this.render();
  }

  get width() {
    return parseInt(parseAttribute(this, "width", defaults["width"]));
  }

  get offset() {
    return parseInt(parseAttribute(this, "offset", defaults["offset"]));
  }

  get bpp() {
    return parseInt(parseAttribute(this, "bpp", defaults["bpp"]));
  }

  get scanline() {
    return parseInt(parseAttribute(this, "scanline", defaults["scanline"]));
  }

  handleInputChange(e) {
    this.setAttribute(e.target.name, e.target.value);
  }

  render() {
    const { editor, $canvas, ctx, width, bpp, scanline } = this;
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
      offset += width * bpp + scanline;
    }
  }

  onChange() {
    cancelAnimationFrame(this.afRid);
    this.afRid = requestAnimationFrame(this.render);
  };

  onPixelClick({ offsetX, offsetY, target }) {
    if (target !== this.$canvas) return;
    const { $canvas, editor, width, offset, bpp, scanline } = this;
    const unit = $canvas.scrollWidth / width;
    const x = Math.floor(offsetX / unit);
    if (x > width) return;
    const y = Math.floor((offsetY + target.scrollTop) / unit);

    const index = (x + y * width) * bpp + y * scanline + offset;
    if (index >= 0 && index < editor.buffer.length) {
      editor.setSelection(index, index + bpp);
    }
  }
}
customElements.define("hv-canvas", Canvas);

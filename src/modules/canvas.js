import { $, debounce, CustomElement } from "../dom.js";
import { createPanel } from "../components/panel.js";

/**
 * @param {number[]} arr
 * @returns {number}
 */
const avg = (arr) => arr.length < 1 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

/**
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
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

const attributes = {
  width: { type: "number", defaultValue: 50 },
  offset: { type: "number", defaultValue: 0 },
  bpp: { type: "number", defaultValue: 1 },
  scanline: { type: "number", defaultValue: 0 },
};

export class Canvas extends CustomElement {
  static observedAttributes = ["width", "offset", "bpp", "scanline"];

  /**
   * @param {HexEditor} editor
   */
  constructor(editor) {
    super(attributes);
    this.editor = editor;

    this.onChange = debounce(this.onChange.bind(this), 200);
    this.onPixelClick = this.onPixelClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.render = this.render.bind(this);

    createPanel(
      this,
      { label: "Canvas", disposable: true },
      {
        body: $("div", { class: "canvas-body" }, [$("canvas")]),
        header: $("div", { class: "panel-toolbar" }, [
          $("label", {}, [
            $("span", {}, ["Offset"]),
            $("input", { type: "number", name: "offset", min: 0, value: attributes["offset"].defaultValue })
          ]),
          $("label", {}, [
            $("span", {}, ["Width"]),
            $("input", { type: "number", name: "width", min: 3, value: attributes["width"].defaultValue }),
          ]),
          $("label", {}, [
            $("span", {}, ["Bytes/pixel"]),
            $("input", { type: "number", name: "bpp", min: 1, value: attributes["bpp"].defaultValue }),
          ]),
          $("label", {}, [
            $("span", {}, ["Scanline offset"]),
            $("input", { type: "number", name: "scanline", min: 0, value: attributes["scanline"].defaultValue })
          ]),
        ])
      }
    );

    this.$canvas = this.querySelector("canvas");
    this.ctx = this.$canvas.getContext("2d", { alpha: false });

    const [offsetInput, widthInput, bppInput, scanlineInput] = this.querySelectorAll("input");
    this._events = [
      [this.editor.buffer, { change: this.onChange }],
      [offsetInput, { change: this.handleInputChange }],
      [widthInput, { change: this.handleInputChange }],
      [bppInput, { change: this.handleInputChange }],
      [scanlineInput, { change: this.handleInputChange }],
      [this, { click: this.onPixelClick }],
    ];
  }

  connectedCallback() {
    super.connectedCallback();

    const [offsetInput, widthInput, bppInput, scanlineInput] = this.querySelectorAll("input");
    offsetInput.value = this.offset;
    widthInput.value = this.width;
    bppInput.value = this.bpp;
    scanlineInput.value = this.scanline;

    this.resizeObserver = new ResizeObserver(this.onChange);
    this.resizeObserver.observe(this);
    this.render();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver.unobserve(this);
    this.resizeObserver = null;
  }

  /**
   * @param {string} name
   * @param {string} oldValue
   * @param {string} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if ([undefined, null].includes(newValue)) return this.setAttribute(name, this.fields[name].defaultValue);

    const [offsetInput, widthInput, bppInput, scanlineInput] = this.querySelectorAll("input");

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

  /**
   * @param {{target: {name: string, value: string} }} event
   */
  handleInputChange(event) {
    this.setAttribute(event.target.name, event.target.value);
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

  /**
   * @param {number} offsetX
   * @param {number} offsetY
   * @param {HTMLElement} target
   */
  onPixelClick({ offsetX, offsetY, target }) {
    if (target !== this.$canvas) return;
    const { $canvas, editor, width, offset, bpp, scanline } = this;
    const unit = $canvas.scrollWidth / width;
    const x = Math.floor(offsetX / unit);
    if (x > width) return;
    const y = Math.floor(offsetY / unit);

    const index = (x + y * width) * bpp + y * scanline + offset;
    if (index >= 0 && index < editor.buffer.length) {
      editor.setSelection(index, index + bpp);
    }
  }
}
customElements.define("hv-canvas", Canvas);

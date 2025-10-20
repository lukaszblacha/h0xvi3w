import { $, debounce, CustomElement } from "../dom.js";
import { createPanel } from "../components/panel.js";

const attributes = {
  width: { type: "number", defaultValue: 50 },
  offset: { type: "number", defaultValue: 0 },
  bpp: { type: "number", defaultValue: 1 },
  scanline: { type: "number", defaultValue: 0 },
  limit: { type: "number", defaultValue: 0 },
};

export class Canvas extends CustomElement {
  static observedAttributes = ["width", "offset", "bpp", "scanline", "limit"];

  /**
   * @param {HexEditor} editor
   */
  constructor(editor) {
    super(attributes);
    this.editor = editor;

    this.onPixelClick = this.onPixelClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.render = this.render.bind(this);
    this.onResize = debounce(this.render.bind(this), 200);
    this.onMessage = this.onMessage.bind(this);

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
            $("span", {}, ["Scanline"]),
            $("input", { type: "number", name: "scanline", min: 0, value: attributes["scanline"].defaultValue })
          ]),
          $("label", {}, [
            $("span", {}, ["Limit"]),
            $("input", { type: "number", name: "limit", min: 0, value: attributes["limit"].defaultValue })
          ]),
        ])
      }
    );

    this.$canvas = this.querySelector("canvas");
    this.worker = new Worker("modules/offscreen-canvas.js");

    const offscreen = this.$canvas.transferControlToOffscreen();
    this.worker.postMessage({
      action: "setup",
      $canvas: offscreen,
    }, [offscreen]);

    const [offsetInput, widthInput, bppInput, scanlineInput, limitInput] = this.querySelectorAll("input");
    this._events = [
      [this.editor.buffer, { change: this.render }],
      [offsetInput, { change: this.handleInputChange }],
      [widthInput, { change: this.handleInputChange }],
      [bppInput, { change: this.handleInputChange }],
      [scanlineInput, { change: this.handleInputChange }],
      [limitInput, { change: this.handleInputChange }],
      [this, { click: this.onPixelClick }],
      [this.worker, { message: this.onMessage }]
    ];
  }

  connectedCallback() {
    super.connectedCallback();

    const [offsetInput, widthInput, bppInput, scanlineInput, limitInput] = this.querySelectorAll("input");
    offsetInput.value = this.offset;
    widthInput.value = this.width;
    bppInput.value = this.bpp;
    scanlineInput.value = this.scanline;
    limitInput.value = this.limit;

    this.resizeObserver = new ResizeObserver(this.onResize);
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
    if ([undefined, null, "null", "undefined"].includes(newValue)) return this.setAttribute(name, this.fields[name].defaultValue);

    const [offsetInput, widthInput, bppInput, scanlineInput, limitInput] = this.querySelectorAll("input");

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
      case "limit": {
        limitInput.value = newValue;
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

  onMessage() {
    console.log(`Render done. Took ${((Date.now() - this.start) / 1000).toFixed(2)}s`);
    this.busy = false;
    if (this.queue) {
      this.render();
    }
  }

  get containerWidth() {
    return this.querySelector(".canvas-body").clientWidth;
  }

  render() {
    const { editor, width, offset, bpp, scanline, limit, containerWidth } = this;

    if (this.busy) {
      this.queue = true;
      return;
    }

    this.queue = false;
    this.busy = true;
    const b = editor.buffer;
    this.start = Date.now();
    this.worker.postMessage({
      action: "render",
      buffer: b.buffer.slice(b.startOffset, b.endOffset),
      containerWidth,
      bpp,
      width,
      offset,
      scanline,
      limit,
    });
  }

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

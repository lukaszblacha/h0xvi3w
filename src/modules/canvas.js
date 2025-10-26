import {$, debounce, CustomElement, toCamelCase} from "../dom.js";
import { createPanel } from "../components/panel.js";

export class Canvas extends CustomElement {
  static customAttributes = {
    width: { type: "number", defaultValue: 50 },
    offset: { type: "number", defaultValue: 0 },
    bpp: { type: "number", defaultValue: 1 },
    scanline: { type: "number", defaultValue: 0 },
    limit: { type: "number", defaultValue: 0 },
  };
  static observedAttributes = Object.keys(Canvas.customAttributes);

  /**
   * @param {HexEditor} editor
   */
  constructor(editor) {
    super();
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
            $("input", { type: "number", name: "offset", min: 0 })
          ]),
          $("label", {}, [
            $("span", {}, ["Width"]),
            $("input", { type: "number", name: "width", min: 3 }),
          ]),
          $("label", {}, [
            $("span", {}, ["Bytes/pixel"]),
            $("input", { type: "number", name: "bpp", min: 1 }),
          ]),
          $("label", {}, [
            $("span", {}, ["Scanline"]),
            $("input", { type: "number", name: "scanline", min: 0 })
          ]),
          $("label", {}, [
            $("span", {}, ["Limit"]),
            $("input", { type: "number", name: "limit", min: 0 })
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

    const [$offset, $width, $bpp, $scanline, $limit] = this.querySelectorAll("input");
    this._events = [
      [this.editor.buffer, { change: this.render }],
      [$offset, { change: this.handleInputChange }],
      [$width, { change: this.handleInputChange }],
      [$bpp, { change: this.handleInputChange }],
      [$scanline, { change: this.handleInputChange }],
      [$limit, { change: this.handleInputChange }],
      [this, { click: this.onPixelClick }],
      [this.worker, { message: this.onMessage }]
    ];
  }

  connectedCallback() {
    super.connectedCallback();

    const [$offset, $width, $bpp, $scanline, $limit] = this.querySelectorAll("input");
    $offset.value = this.offset;
    $width.value = this.width;
    $bpp.value = this.bpp;
    $scanline.value = this.scanline;
    $limit.value = this.limit;

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

    const [$offset, $width, $bpp, $scanline, $limit] = this.querySelectorAll("input");

    switch (name) {
      case "width": {
        $width.setAttribute("value", newValue);
        break;
      }
      case "offset": {
        $offset.setAttribute("value", newValue);
        break;
      }
      case "bpp": {
        $bpp.setAttribute("value", newValue);
        break;
      }
      case "scanline": {
        $scanline.setAttribute("value", newValue);
        break;
      }
      case "limit": {
        $limit.setAttribute("value", newValue);
        break;
      }
      default: return;
    }
    this.render();
  }

  handleInputChange(e) {
    const { name: inputName, type } = e.target;
    const name = toCamelCase(inputName);
    if (name in this) {
      switch (type) {
        case "checkbox":
          return this[name] = e.target.checked;
        case "number":
          return this[name] = e.target.valueAsNumber;
        default:
          this[name] = e.target.value;
      }
    }
  }

  onMessage() {
    this.busy = false;
    if (this.queue) {
      this.render();
    }
  }

  get containerWidth() {
    return this.querySelector(".canvas-body").offsetWidth;
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

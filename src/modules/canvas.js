import { $, bindAll, unbindAll, debounce } from "../dom.js";
import { Panel } from "../components/panel.js";

export class Canvas extends Panel {
  static observedAttributes = ["width", "offset"];

  constructor(editor) {
    super({ label: "Canvas" }, {
      body: $("div", { class: "canvas-body" }, [$("canvas")]),
      footer: [
        "offset:",
        $("input", { type: "number", name: "offset", min: 0, step: 1 }),
        "width:",
        $("input", { type: "number", name: "width", min: 3, step: 1 })
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
    this.ctx = this.$canvas.getContext("2d");

    const [offsetInput, widthInput] = this.querySelectorAll("input");
    offsetInput.value = this.getAttribute("offset");
    widthInput.value = this.getAttribute("width");

    this.resizeObserver = new ResizeObserver(this.onChange);
    bindAll(this.editor.buffer, { change: this.onChange });
    bindAll(offsetInput, { change: this.handleInputChange });
    bindAll(widthInput, { change: this.handleInputChange });
    bindAll(this, { click: this.onPixelClick });
    this.resizeObserver.observe(this);
    this.render();
  }

  disconnectedCallback() {
    const [offsetInput, widthInput] = this.querySelectorAll("input");
    unbindAll(this.editor.buffer, { change: this.onChange });
    unbindAll(offsetInput, { change: this.handleInputChange });
    unbindAll(widthInput, { change: this.handleInputChange });
    unbindAll(this, { click: this.onPixelClick });
    this.resizeObserver.unobserve(this);
    this.resizeObserver = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    const [offsetInput, widthInput] = this.querySelectorAll("input");
    switch (name) {
      case "width": {
        widthInput.value = newValue;
        break;
      }
      case "offset": {
        offsetInput.value = newValue;
        break;
      }
      default: return;
    }
    this.render();
  }

  handleInputChange(e) {
    this.setAttribute(e.target.name, e.target.value);
  }

  render() {
    const { editor, $canvas, ctx } = this;
    const $body = this.querySelector(".canvas-body");
    const width = parseInt(this.getAttribute("width"));
    let offset = parseInt(this.getAttribute("offset"));
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
    const { $canvas, editor } = this;
    const width = parseInt(this.getAttribute("width"));
    const offset = parseInt(this.getAttribute("offset"));
    const unit = $canvas.scrollWidth / width;
    const x = Math.floor(offsetX / unit);
    const y = Math.floor((offsetY + target.scrollTop) / unit);

    const index = x + y * width + offset;
    if (index >= 0 && index < editor.buffer.length) {
      editor.setSelection(index, index + 1);
    }
  }
}
customElements.define("hv-canvas", Canvas);

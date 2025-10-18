import { $, CustomElement, debounce } from "../dom.js";
import { createPanel } from "../components/panel.js";
import { highlight, range } from "../utils/text.js";
import { DataBuffer } from "../structures/buffer.js";
import { DataWindow } from "../components/window.js";
import { binToU8, charToU8, hexToU8, u8ToBin, u8ToChar, u8ToHex } from "../utils/converters.js";
import { normalizeInt, normalizeSelectionOffsets, quantizeDown } from "../utils/numbers.js";

function parseViewsAttribute(str) {
  return (str || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function updateModeLabel($node, mode) {
  $node.innerText = mode === "insert" ? "INS" : "OVR";
}

const displayValue = (num) =>
  `${num.toString(16).toUpperCase()}h (${num.toString()})`;

const headerText = (lineWidth, charsPerByte = 1) =>
  Array(lineWidth).fill(0).map((_, i) => i.toString(16).padEnd(charsPerByte, " ")).join("").toUpperCase();

const viewSettings = Object.freeze({
  bin: {
    renderByte: u8ToBin,
    toByte: binToU8,
    inputRegex: /^[01]*$/,
    charsPerByte: 8,
  },
  hex: {
    renderByte: u8ToHex,
    toByte: hexToU8,
    inputRegex: /^[0-9a-f]*$/,
    charsPerByte: 2,
  },
  ascii: {
    renderByte: u8ToChar,
    toByte: charToU8,
    inputRegex: /.*/,
    charsPerByte: 1,
  }
});

const attributes = {
  mode: { type: "string", defaultValue: "overwrite" },
  views: { type: "string", defaultValue: "hex,ascii" },
};

export class HexEditor extends CustomElement {
  static observedAttributes = Object.keys(attributes);

  constructor(lineWidth = 16) {
    super(attributes);

    this.lineWidth = lineWidth;
    this.numLines = 0;
    this.characterHeight = 20; // px
    this.viewOffsetStart = 0;
    this.fileName = "data.bin";
    this.selectionStartOffset = 0;
    this.selectionEndOffset = 0;
    this.buffer = new DataBuffer();
    this.availableViews = { bin: { active: false }, hex: { active: false }, ascii: { active: false } };

    this.onResize = debounce(this.onResize.bind(this), 100);

    createPanel(
      this,
      { label: "Editor", disposable: false }, {
        header: [
          $("div", { class: "col-index" }, "offset"),
          $("div", { class: "col-bin hidden notranslate" }, headerText(lineWidth, 8)),
          $("div", { class: "col-hex hidden notranslate" }, headerText(lineWidth, 2)),
          $("div", { class: "col-ascii hidden notranslate" }, headerText(lineWidth, 1)),
        ],
        body: [
          $("div", { class: "col-index" }),
          $("div", { class: "col-bin hidden" }),
          $("div", { class: "col-hex hidden" }),
          $("div", { class: "col-ascii hidden" })
        ],
        footer: [$("div"), $("div"), $("div"), $("div")],
      }
    );

    this._events = [
      [this.$dom.$mode, { click: this.switchMode.bind(this) }],
      [this, {
        windowselectionchange: this.onWindowSelectionChange.bind(this)
      }, false],
      [this.buffer, {
        change: this.onBufferChange.bind(this),
      }]
    ];
  }

  connectedCallback() {
    const views = this.views.split(",");
    super.connectedCallback();
    if(views.length < 1) {
      this.setAttribute("views", "hex,ascii");
    }

    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this);

    Object.keys(this.availableViews).forEach((view) => {
      if (views.includes(view)) this.enableView(view);
      else this.disableView(view);
    });

    updateModeLabel(this.$dom.$mode, this.mode);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver.unobserve(this);
    this.resizeObserver = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if ([undefined, null].includes(newValue)) return this.setAttribute(name, this.fields[name].defaultValue);

    switch (name) {
      case "views": {
        const enabledViews = parseViewsAttribute(newValue);
        this.updateGridTemplate(enabledViews);
        Object.keys(this.availableViews).forEach((view) => {
          if (enabledViews.includes(view)) this.enableView(view);
          else this.disableView(view);
        });
        break;
      }
      case "mode": {
        updateModeLabel(this.$dom.$mode, this.mode);
        break;
      }
      default: return;
    }
  }

  get viewOffsetEnd() {
    const { viewOffsetStart, lineWidth, numLines } = this;
    return viewOffsetStart + lineWidth * numLines;
  }

  updateGridTemplate(views) {
    let tpl = "55px";
    if (views.includes("bin")) tpl += " 128ch";
    if (views.includes("hex")) tpl += " 32ch";
    if (views.includes("ascii")) tpl += " 16ch";
    this.querySelector(".panel-header").style.gridTemplateColumns = tpl;
    this.querySelector(".panel-body").style.gridTemplateColumns = tpl;
  }

  enableView(name) {
    if (!(name in this.availableViews) || this.availableViews[name].active) return;

    const { buffer, viewOffsetStart, viewOffsetEnd, selectionStartOffset, selectionEndOffset } = this;

    const cfg = this.availableViews[name];
    cfg.window = this.createDataView(name);
    this.querySelector(`.panel-header .col-${name}`).classList.remove("hidden");
    this.querySelector(`.panel-body .col-${name}`).replaceWith(cfg.window);
    cfg.active = true;
    cfg.window.render(buffer.slice(viewOffsetStart, viewOffsetEnd));
    this.updateSelection(selectionStartOffset, selectionEndOffset);
    highlight("selection", Object.values(this.availableViews).map(({ window }) => window?.selectionRange).filter(Boolean));
  }

  disableView(name) {
    const { availableViews } = this;
    if (!(name in availableViews) || !availableViews[name].active) return;
    const cfg = availableViews[name];

    this.querySelector(`.panel-header .col-${name}`).classList.add("hidden");
    this.querySelector(`.panel-body .col-${name}`).replaceWith($("div", { class: `col-${name} hidden` }));
    cfg.active = false;
    delete cfg.window;
    highlight("selection", Object.values(availableViews).map(({ window }) => window?.selectionRange).filter(Boolean));
  }

  toggleView(name) {
    const views = this.views.split(",");
    if (views.includes(name)) {
      this.setAttribute("views", views.filter((v) => v !== name).join(","));
    } else {
      this.setAttribute("views", [...views, name].join(","));
    }
  }

  getBuffer() {
    return this.buffer.getBuffer();
  }

  get $dom() {
    const [$pos, $val, $size, $mode] = this.querySelectorAll(".panel-footer > *");
    const $body = this.querySelector(".panel-body");
    const $index = $body.firstChild;

    return { $pos, $val, $size, $mode, $index, $body };
  }

  updateSelection(base, extent = base) {
    [this.selectionStartOffset, this.selectionEndOffset] = normalizeSelectionOffsets(base, extent);

    const { buffer, selectionStartOffset, selectionEndOffset, $dom: { $pos, $val } } = this;

    const collapsed = Math.abs(base - extent) < 2;
    $pos.innerText = `${collapsed ? "pos" : "start"}: ${displayValue(selectionStartOffset)}`;
    $val.innerText = selectionStartOffset < buffer.length ? (
      selectionEndOffset !== selectionStartOffset
        ? `sel: ${displayValue(selectionEndOffset - selectionStartOffset)}`
        : `val: ${displayValue(buffer.at(selectionStartOffset))}`
    ) : "";

    Object.values(this.availableViews).forEach(({ active, window })=> {
      if (active) {
        window.setSelection(selectionStartOffset, selectionEndOffset);
      }
    });

    this.trigger("select", {
      buffer,
      startOffset: this.selectionStartOffset,
      endOffset: this.selectionEndOffset,
      length: this.selectionEndOffset - this.selectionStartOffset,
    });
  }

  onWindowSelectionChange({ detail: { startOffset, endOffset } }) {
    this.updateSelection(startOffset, endOffset);
  }

  switchMode() {
    this.setAttribute("mode", this.mode === "insert" ? "overwrite" : "insert");
  }

  setBuffer(buf) {
    const { buffer, $dom: { $size, $index } } = this;
    buffer.from(buf);

    $size.innerText = `size: ${displayValue(buffer.length)}`;

    $index.innerText = new Array(Math.ceil(buffer.length / this.lineWidth)).fill(0)
      .map((_, i) => (i * this.lineWidth)
        .toString(16)
        .padStart(6, 0))
      .join("\n");

      this.trigger("load", { buffer: buffer.getBuffer() });

      this.setSelection(0);
  }

  onBufferChange() {
    const { buffer, viewOffsetStart, viewOffsetEnd, $dom: { $size } } = this;
    $size.innerText = `size: ${displayValue(buffer.length)}`;

    Object.values(this.availableViews).forEach(({ active, window }) => {
      if (active) {
        window.render(buffer.slice(viewOffsetStart, viewOffsetEnd));
      }
    });
    // update selection if scrolled?
  }

  onResize() {
    const { characterHeight, numLines, $dom: { $body } } = this;
    this.numLines = Math.floor($body.clientHeight / characterHeight);
    if (this.numLines !== numLines) {
      this.onBufferChange();
    }
  }

  setSelection(start, end = start) {
    const { viewOffsetEnd } = this;
    const [byteOffsetStart, byteOffsetEnd] = normalizeSelectionOffsets(start, end);
    if (byteOffsetEnd > viewOffsetEnd) {
      this.scrollToPosition(byteOffsetEnd);
    } else {
      this.scrollToPosition(byteOffsetStart);
    }
    this.updateSelection(start, end);
  }

  setHighlights(arr = []) {
    const groups = Array
      .from(new Set(arr.map(({ name }) => name)))
      .reduce((obj, name) => ({ ...obj, [name]: [] }), {});
    arr.forEach(({ name, start, end }) => {
      groups[name].push(range(this.availableViews.ascii.window.$textNode, start, end));
    });
    Object.entries(groups).forEach(([name, ranges]) => {
      highlight(name, ranges);
    })
  }

  scrollToPosition(pos) {
    const { buffer, lineWidth, numLines, viewOffsetStart } = this;
    const windowSize = lineWidth * numLines;
    pos = normalizeInt(pos, 0, buffer.length);

    if (pos < viewOffsetStart) {
      this.viewOffsetStart = quantizeDown(pos, lineWidth);
      this.onBufferChange();
    } else if (pos >= viewOffsetStart + windowSize) {
      const lineStartOffset = quantizeDown(pos, lineWidth);
      this.viewOffsetStart = normalizeInt(lineStartOffset - windowSize + lineWidth, 0, buffer.length);
      this.onBufferChange();
    }
  }

  createDataView(name) {
    const settings = viewSettings[name];
    if (!settings) throw new Error(`Unknown DataWindow type "${name}".`)
    const w = new DataWindow({ ...settings, editor: this });
    w.classList.add(`col-${name}`);
    return w;
  }

  openFile(buf, name) {
    this.fileName = name;
    this.setBuffer(buf);
  }
}
customElements.define("hv-editor", HexEditor);

import { $, CustomElement, debounce } from "../dom.js";
import { createPanel } from "../components/panel.js";
import { highlight, range } from "../utils/text.js";
import { DataBuffer } from "../structures/buffer.js";
import { Scrollbar } from "../components/scrollbar.js";
import { DataWindow } from "../components/window.js";
import { binToU8, charToU8, hexToU8, u8ToBin, u8ToChar, u8ToHex } from "../utils/converters.js";
import { normalizeNumber, normalizeSelectionOffsets } from "../utils/numbers.js";

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
          $("div", { class: "col-ascii hidden" }),
          new Scrollbar(),
        ],
        footer: [$("div"), $("div"), $("div"), $("div")],
      }
    );

    const { $mode, $body, $scrollbar } = this.$dom;
    this._events = [
      [$mode, { click: this.switchMode.bind(this) }],
      [$body, { wheel: $scrollbar.onWheel }],
      [$scrollbar, { vscroll: this.onScroll.bind(this) }],
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
    if ([undefined, null, "null", "undefined"].includes(newValue)) return this.setAttribute(name, this.fields[name].defaultValue);

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
    if (views.includes("bin")) tpl += ` ${this.lineWidth * 8}ch`;
    if (views.includes("hex")) tpl += ` ${this.lineWidth * 2}ch`;
    if (views.includes("ascii")) tpl += ` ${this.lineWidth}ch`;
    this.querySelector(".panel-header").style.setProperty("grid-template-columns", tpl);
    this.querySelector(".panel-body").style.setProperty("grid-template-columns", tpl);
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
    const $scrollbar = $body.querySelector("hv-scrollbar");

    return { $pos, $val, $size, $mode, $index, $body, $scrollbar };
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
    const { buffer, $dom: { $size } } = this;
    buffer.from(buf);

    $size.innerText = `size: ${displayValue(buffer.length)}`;
    this.renderOffsets();
    this.trigger("load", { buffer: buffer.getBuffer() });
    this.setSelection(0);
  }

  onBufferChange() {
    const { buffer, numLines, lineWidth, viewOffsetStart, viewOffsetEnd, characterHeight, $dom } = this;
    $dom.$size.innerText = `size: ${displayValue(buffer.length)}`;

    Object.values(this.availableViews).forEach(({ active, window }) => {
      if (active) {
        window.render(buffer.slice(viewOffsetStart, viewOffsetEnd));
      }
    });

    $dom.$scrollbar.containerScrollSize = Math.ceil(buffer.length / lineWidth) * characterHeight;
    $dom.$scrollbar.containerSize = numLines * characterHeight;
  }

  onResize() {
    const { characterHeight, numLines, $dom } = this;
    this.numLines = Math.floor($dom.$body.offsetHeight / characterHeight);
    if (this.numLines !== numLines) {
      $dom.$scrollbar.containerSize = numLines * characterHeight;
      this.onBufferChange();
      this.$dom.$scrollbar.render();
    }
  }

  setSelection(start, end = start) {
    const { viewOffsetEnd } = this;
    const [byteOffsetStart, byteOffsetEnd] = normalizeSelectionOffsets(start, end);
    if (byteOffsetEnd > viewOffsetEnd) {
      this.scrollIntoView(byteOffsetEnd);
    } else {
      this.scrollIntoView(byteOffsetStart);
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

  onScroll({ detail: { position } }) {
    const line = Math.floor(position / this.characterHeight);
    this.scrollToLine(line);
  }

  scrollToLine(line) {
    const { buffer, lineWidth, characterHeight, viewOffsetStart, numLines } = this;
    const maxLine = Math.max(0, Math.ceil(buffer.length / lineWidth) - numLines);
    line = normalizeNumber(line, 0, maxLine);
    if (line * lineWidth !== viewOffsetStart) {
      this.viewOffsetStart = line * lineWidth;
      this.onBufferChange();
      this.renderOffsets();
      this.$dom.$scrollbar.position = line * characterHeight;
    }
  }

  scrollIntoView(pos) {
    const { buffer, lineWidth, numLines, viewOffsetStart } = this;
    const windowSize = lineWidth * numLines;
    pos = normalizeNumber(pos, 0, buffer.length);

    if (pos < viewOffsetStart) {
      this.scrollToLine(Math.floor(pos / lineWidth));
    } else if (pos >= viewOffsetStart + windowSize) {
      const line = Math.ceil(pos / lineWidth) - numLines;
      this.scrollToLine(line);
    }
  }

  renderOffsets() {
    const { lineWidth, viewOffsetStart, numLines } = this;

    this.$dom.$index.innerText = new Array(numLines).fill(0)
      .map((_, i) => (viewOffsetStart + i * lineWidth)
        .toString(16)
      )
      .join("\n");
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

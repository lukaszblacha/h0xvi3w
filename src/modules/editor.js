import { $, bindAll, parseAttribute, unbindAll } from "../dom.js";
import { Panel } from "../components/panel.js";
import {highlight, range, setCaret} from "../utils/text.js";
import { DataBuffer } from "../structures/buffer.js";
import { DataWindow } from "../components/window.js";
import { binToU8, charToU8, hexToU8, u8ToBin, u8ToChar, u8ToHex } from "../utils/converters.js";

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

function normalizeSelectionRange(baseOffset, extentOffset, charsPerByte = 1) {
  const start = Math.min(baseOffset, extentOffset);
  const end = Math.max(baseOffset, extentOffset);
  return [Math.floor(start / charsPerByte), Math.ceil(end / charsPerByte)];
}

function getViewSettings(name) {
  switch(name) {
    case "bin": return {
      renderByte: u8ToBin,
      charsPerByte: 8,
    }
    case "hex": return {
      renderByte: u8ToHex,
      charsPerByte: 2,
    }
    case "ascii": return {
      renderByte: u8ToChar,
      charsPerByte: 1,
    }
    default: throw new Error(`Unknown DataWindow type "${name}".`);
  }
}

const createDataView = (name, buffer, lineWidth) => {
  const { charsPerByte, renderByte } = getViewSettings(name);
  const w = new DataWindow({ buffer, renderByte });
  w.classList.add(`col-${name}`);
  w.style.width = `${lineWidth * charsPerByte}ch`;
  return w;
}

const defaults = {
  mode: "overwrite",
  views: "hex,ascii",
};

export class HexEditor extends Panel {
  static observedAttributes = ["views", "mode"];

  constructor(lineWidth = 16) {
    super({ label: "Editor" }, {
      header: [
        $("div", { class: "col-index" }, "offset"),
        $("div", { class: "col-bin hidden" }, headerText(lineWidth, 8)),
        $("div", { class: "col-hex hidden" }, headerText(lineWidth, 2)),
        $("div", { class: "col-ascii hidden" }, headerText(lineWidth, 1)),
      ],
      body: [
        $("div", { class: "col-index" }),
        $("div", { class: "col-bin hidden" }),
        $("div", { class: "col-hex hidden" }),
        $("div", { class: "col-ascii hidden" })
      ],
      footer: [$("div"), $("div"), $("div"), $("div")],
    });

    this.onBeforeInput = this.onBeforeInput.bind(this);
    this.onSelectionChange = this.onSelectionChange.bind(this);
    this.switchMode = this.switchMode.bind(this);

    this.lineWidth = lineWidth;
    this.fileName = "data.bin";
    this.selectionStartOffset = 0;
    this.selectionEndOffset = 0;
    this.buffer = new DataBuffer();
    this.views = { bin: { active: false }, hex: { active: false }, ascii: { active: false } };
  }

  connectedCallback() {
    super.connectedCallback();
    if(this.activeViews.length < 1) {
      this.setAttribute("views", "hex,ascii");
    }

    Object.keys(this.views).forEach((view) => {
      if (this.activeViews.includes(view)) this.enableView(view);
      else this.disableView(view);
    });

    bindAll(this.$dom.$mode, { click: this.switchMode });
    updateModeLabel(this.$dom.$mode, this.mode);
  }

  disconnectedCallback() {
    unbindAll(this.$dom.$mode, { click: this.switchMode });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    switch (name) {
      case "views": {
        const enabledViews = parseViewsAttribute(newValue);
        Object.keys(this.views).forEach((view) => {
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

  get mode() {
    return parseAttribute(this, "mode", defaults["mode"]);
  }

  get activeViews() {
    return parseViewsAttribute(parseAttribute(this, "views", defaults["views"]));
  }

  bindViewEventHandlers(view) {
    bindAll(view, {
      beforeinput: this.onBeforeInput,
      selectionchange: this.onSelectionChange
    });
  }

  unbindViewEventHandlers(view) {
    unbindAll(view, {
      beforeinput: this.onBeforeInput,
      selectionchange: this.onSelectionChange
    });
  }

  enableView(name) {
    if (!(name in this.views) || this.views[name].active) return;
    const cfg = this.views[name];

    cfg.window = createDataView(name, this.buffer, this.lineWidth);
    this.querySelector(`.panel-header .col-${name}`).classList.remove("hidden");
    this.querySelector(`.panel-body .col-${name}`).replaceWith(cfg.window);
    cfg.active = true;
    this.bindViewEventHandlers(cfg.window);
    cfg.window.render();
    this.updateSelection(this.selectionStartOffset, this.selectionEndOffset);
    highlight("selection", Object.values(this.views).map(({ window }) => window?.selectionRange).filter(Boolean));
  }

  disableView(name) {
    if (!(name in this.views) || !this.views[name].active) return;
    const cfg = this.views[name];

    this.unbindViewEventHandlers(cfg.window);
    this.querySelector(`.panel-header .col-${name}`).classList.add("hidden");
    this.querySelector(`.panel-body .col-${name}`).replaceWith($("div", { class: `col-${name} hidden` }));
    cfg.active = false;
    delete cfg.window;
    highlight("selection", Object.values(this.views).map(({ window }) => window?.selectionRange).filter(Boolean));
  }

  toggleView(name) {
    const { activeViews } = this;
    if (activeViews.includes(name)) {
      this.setAttribute("views", activeViews.filter((v) => v !== name).join(","));
    } else {
      this.setAttribute("views", [...activeViews, name].join(","));
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
    const { buffer, $dom: { $pos, $val } } = this;

    this.selectionStartOffset = Math.min(base, extent);
    this.selectionEndOffset = Math.max(base, extent);

    const collapsed = Math.abs(base - extent) < 2;
    $pos.innerText = `${collapsed ? "pos" : "start"}: ${displayValue(this.selectionStartOffset)}`;
    $val.innerText = this.selectionStartOffset < buffer.length ? (
      this.selectionEndOffset !== this.selectionStartOffset
        ? `sel: ${displayValue(this.selectionEndOffset - this.selectionStartOffset)}`
        : `val: ${displayValue(buffer.at(this.selectionStartOffset))}`
    ) : "";

    Object.entries(this.views).filter(([, { active }]) => active).forEach(([name, { window }])=> {
      const { charsPerByte } = getViewSettings(name);
      window.setSelection(this.selectionStartOffset * charsPerByte, this.selectionEndOffset * charsPerByte);
    });

    this.dispatchEvent(new CustomEvent("select", { detail: {
      buffer,
      startOffset: this.selectionStartOffset,
      endOffset: this.selectionEndOffset,
      length: this.selectionEndOffset - this.selectionStartOffset,
    } }));
  }

  normalizeInput(text, inputType, offset) {
    const { buffer, mode } = this;
    const activeWindow = this.views[inputType].window;
    const { charsPerByte } = activeWindow;
    let caret = offset;
    if (!text) return [undefined, caret];

    if (inputType === "ascii") {
      return [text.split("").map(charToU8), caret + text.length];
    }

    const options = charsPerByte === 8
      ? { toText: u8ToBin, toByte: binToU8, inputRegex: /^[01]*$/i }
      : { toText: u8ToHex, toByte: hexToU8, inputRegex: /^[0-9a-f]*$/i };

    if (!text.match(options.inputRegex)) return [undefined, caret];

    caret += text.length;
    if (offset % charsPerByte !== 0) {
      const firstByteOffset = Math.floor(offset / charsPerByte);
      const byte = options.toText(buffer.at(firstByteOffset));
      const diff = text.length;
      text = byte.substring(0, offset % charsPerByte).concat(text);
      offset -= diff;
    }

    if (text.length % charsPerByte !== 0) {
      if (mode === "insert") {
        // TODO: always overwrites the rest of currently edited byte
        text = text.concat(new Array(charsPerByte - text.length % charsPerByte).fill('0').join(""));
      } else {
        const lastByteOffset = Math.floor(offset / charsPerByte) + Math.floor(text.length / charsPerByte);
        const byte = options.toText(buffer.at(lastByteOffset));
        text = text.concat(byte.substring(text.length % charsPerByte));
      }
    }

    return [text.match(new RegExp(`.{${charsPerByte}}`, "g")).map(options.toByte), caret];
  }

  onBeforeInput(e) {
    e.preventDefault();
    const { baseOffset, extentOffset, baseNode: $node, extentNode } = document.getSelection();
    if ($node !== extentNode) return;

    const activeWindow = Object.values(this.views).find(({active, window}) => active && window.$textNode === $node).window;
    let [startOffset, endOffset] = normalizeSelectionRange(baseOffset, extentOffset, activeWindow.charsPerByte);

    switch (e.inputType) {
      case "insertFromDrop":
      case "insertFromPaste":
      case "insertText": {
        const data = activeWindow === this.views.ascii.window ? e.data : e.data?.replace(/\s+/gm, "");
        const [chunk, caretOffset] = this.normalizeInput(data, activeWindow === this.views.hex.window ? "hex" : activeWindow === this.views.bin.window ? "bin" : "ascii", Math.min(baseOffset, extentOffset));
        if (!chunk) return;

        if (this.mode === "insert") {
          this.buffer.insert(chunk, startOffset, endOffset);
        } else {
          if (startOffset + chunk.length > this.buffer.length) return;
          this.buffer.set(chunk, startOffset);
        }
        setCaret($node, caretOffset);
        return;
      }
      case "deleteByDrag":
      case "deleteByCut":
      case "deleteContent":
      case "deleteContentForward":
      case "deleteContentBackward": {
        const direction = e.inputType.toLowerCase().includes("backward") ? -1 : 1;

        if (startOffset === endOffset) {
          if(direction < 0) {
            startOffset--;
          } else {
            endOffset++;
          }
        }

        let caretOffset = startOffset;
        const bytesToDelete = endOffset - startOffset;
        if (this.mode === "insert") {
          this.buffer.delete(startOffset, bytesToDelete);
        } else {
          const chunk = new Uint8Array(Array(Math.max(bytesToDelete, 1)).fill(0));
          this.buffer.set(chunk, startOffset);
          caretOffset = direction > 0 ? endOffset : startOffset;
        }
        setCaret($node, caretOffset * activeWindow.charsPerByte);
        return;
      }
      case "historyUndo":
      case "historyRedo":
      default: {
        alert("Unknown input type", e.inputType);
        console.error("Unknown input type", e);
      }
    }
  }

  onSelectionChange(e) {
    const { focusNode, startOffset, endOffset } = e.detail;
    const activeWindow = focusNode === this.views.hex.window?.$textNode ? this.views.hex.window : focusNode === this.views.bin.window?.$textNode ? this.views.bin.window : this.views.ascii.window;
    const [start, end] = normalizeSelectionRange(startOffset, endOffset, activeWindow.charsPerByte);

    this.updateSelection(start, end);
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

      this.dispatchEvent(new CustomEvent("load", { detail: { buffer: buffer.getBuffer() } }));

      Object.values(this.views).filter(({ active }) => active).forEach(({ window }) => window.render());
      this.setSelection(0);
  }

  setSelection(start, end = start) {
    const { $body } = this.$dom;
    $body.scrollTop = Math.floor(start / this.lineWidth) * 20;
    this.updateSelection(start, end);
  }

  setHighlights(arr = []) {
    const groups = Array
      .from(new Set(arr.map(({ name }) => name)))
      .reduce((obj, name) => ({ ...obj, [name]: [] }), {});
    arr.forEach(({ name, start, end }) => {
      groups[name].push(range(this.views.ascii.window.$textNode, start, end));
    });
    Object.entries(groups).forEach(([name, ranges]) => {
      highlight(name, ranges);
    })
  }

  openFile(buf, name) {
    this.fileName = name;
    this.setBuffer(buf);
  }
}
customElements.define("hv-editor", HexEditor);

import { $, bindAll, unbindAll } from "../dom.js";
import { Panel } from "../components/panel.js";
import { highlight, setCaret } from "../utils/text.js";
import { DataBuffer } from "../structures/buffer.js";
import { DataWindow } from "../components/window.js";
import { bindClassMethods } from "../utils/classes.js";
import { binToU8, charToU8, hexToU8, u8ToBin, u8ToChar, u8ToHex } from "../utils/converters.js";

const displayValue = (num) =>
  `${num.toString(16).toUpperCase()}h (${num.toString()})`;

const headerText = (lineWidth, charsPerByte = 1) =>
  Array(lineWidth).fill(0).map((_, i) => i.toString(16).padEnd(charsPerByte, " ")).join("").toUpperCase();

const createEditorNode = (lineWidth = 16) => {
  const { $element } = new Panel({ class: "editor", label: "Editor" }, {
    header: [
      $.div({ class: "col-index" }, "offset"),
      $.div({ class: "col-bin hidden" }, headerText(lineWidth, 8)),
      $.div({ class: "col-hex hidden" }, headerText(lineWidth, 2)),
      $.div({ class: "col-ascii hidden" }, headerText(lineWidth, 1)),
    ],
    body: [
      $.div({ class: "col-index" }),
      $.div({ class: "col-bin hidden" }),
      $.div({ class: "col-hex hidden" }),
      $.div({ class: "col-ascii hidden" })
    ],
    footer: [$.div(), $.div(), $.div(), $.div()],
  });

  return $element;
}

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
  return new DataWindow({
    class: `col-${name}`,
    style: `width: ${lineWidth * charsPerByte}ch`,
  }, { buffer, renderByte });
}

export class HexEditor extends EventTarget {
  constructor(lineWidth = 16) {
    super();
    bindClassMethods(this);

    this.lineWidth = lineWidth;
    this.insertMode = true;
    this.fileName = "data.bin";
    this.selectionStartOffset = 0;
    this.selectionEndOffset = 0;
    this.buffer = new DataBuffer();
    this.$element = createEditorNode(this.lineWidth);
    this.views = { bin: { active: false }, hex: { active: false }, ascii: { active: false } };

    const { $mode } = this.$dom;
    bindAll($mode, { click: this.switchMode });
    this.switchMode();
  }

  bindViewEventHandlers(view) {
    bindAll(view.$element, { beforeinput: this.onBeforeInput });
    bindAll(view, { selectionchange: this.onSelectionChange });
  }

  unbindViewEventHandlers(view) {
    unbindAll(view.$element, { beforeinput: this.onBeforeInput });
    unbindAll(view, { selectionchange: this.onSelectionChange });
  }

  toggleView(name) {
    if (!(name in this.views)) return;
    const cfg = this.views[name];
    if (cfg.active) {
      this.unbindViewEventHandlers(cfg.window);
      this.$element.querySelector(`.panel-header .col-${name}`).classList.add("hidden");
      this.$element.querySelector(`.panel-body .col-${name}`).replaceWith($.div({ class: `col-${name} hidden` }));
      cfg.window.destroy?.();
      cfg.active = false;
      delete cfg.window;
    } else {
      cfg.window = createDataView(name, this.buffer, this.lineWidth);
      this.$element.querySelector(`.panel-header .col-${name}`).classList.remove("hidden");
      this.$element.querySelector(`.panel-body .col-${name}`).replaceWith(cfg.window.$element);
      cfg.active = true;
      this.bindViewEventHandlers(cfg.window);
      cfg.window.render();
      this.updateSelection(this.selectionStartOffset, this.selectionEndOffset);
    }
    highlight("selection", Object.values(this.views).map(({ window }) => window?.selectionRange).filter(Boolean));
  }

  getBuffer() {
    return this.buffer.getBuffer();
  }

  get $dom() {
    const { $element } = this;
    const [$pos, $val, $size, $mode] = $element.querySelectorAll(".panel-footer > *");
    const $body = $element.querySelector(".panel-body");
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
    const { buffer, insertMode } = this;
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
      if (insertMode) {
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

    const activeWindow = Object.values(this.views).find(({active, window}) => active && window.$textNode === $node);
    let [startOffset, endOffset] = normalizeSelectionRange(baseOffset, extentOffset, activeWindow.charsPerByte);

    switch (e.inputType) {
      case "insertFromDrop":
      case "insertFromPaste":
      case "insertText": {
        const data = activeWindow === this.views.ascii.window ? e.data : e.data?.replace(/\s+/gm, "");
        const [chunk, caretOffset] = this.normalizeInput(data, activeWindow === this.views.hex.window ? "hex" : activeWindow === this.views.bin.window ? "bin" : "ascii", Math.min(baseOffset, extentOffset));
        if (!chunk) return;

        if (this.insertMode) {
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
        if (this.insertMode) {
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
    const { $mode } = this.$dom;
    this.insertMode = !this.insertMode;
    $mode.innerText = this.insertMode ? "INS" : "OVR";
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

  openFile(buf, name) {
    this.fileName = name;
    this.setBuffer(buf);
  }
}

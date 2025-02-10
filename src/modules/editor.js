import { $, bindAll } from "../dom.js";
import { Panel } from "../components/panel.js";
import { highlight, setCaret } from "../utils/text.js";
import { DataBuffer } from "../structures/buffer.js";
import { DataWindow } from "../components/window.js";
import { bindClassMethods } from "../utils/classes.js";

const displayValue = (num) =>
  `${num.toString(16).toUpperCase()}h (${num.toString()})`;

export const isPrintableCharacter = (i) => i >= 0x20 && i < 0x7f;
const hexToU8 = (s) => parseInt(s, 16);
const binToU8 = (s) => parseInt(s, 2);
const charToU8 = (c) => c.charCodeAt(0);
const u8ToChar = (i) => isPrintableCharacter(i) ? String.fromCharCode(i) : '·';
const u8ToHex = (i) => i.toString(16).padStart(2, "0");
const u8ToBin = (i) => i.toString(2).padStart(8, "0");

const $editor = (lineWidth = 16, buffer) => {
  const headerText = Array(lineWidth).fill(0).fill(0).map((_, i) => i.toString(16)).join("").toUpperCase();

  const ascii = new DataWindow({
    class: "col-ascii",
    style: `width: ${lineWidth}ch`,
  }, {
    buffer,
    renderByte: u8ToChar,
  });

  const hex = new DataWindow({
    class: "col-hex",
    style: `width: ${lineWidth * 2}ch`,
  }, {
    buffer,
    renderByte: u8ToHex,
  });

  const bin = new DataWindow({
    class: "col-bin",
    style: `width: ${lineWidth * 8}ch`,
  }, {
    buffer,
    renderByte: u8ToBin,
  });

  const { $element } = new Panel({ class: "editor", label: "Editor" }, {
    header: [
      $.div({ class: "col-index" }, "offset"),
      $.div({ class: "col-bin" }, headerText.split("").map((c) => `${c}       `).join("")),
      $.div({ class: "col-hex" }, headerText.split("").map((c) => `${c} `).join("")),
      $.div({ class: "col-ascii" }, headerText),
    ],
    body: [
      $.div({ class: "col-index" }),
      bin.$element,
      hex.$element,
      ascii.$element
    ],
    footer: [$.div(), $.div(), $.div(), $.div()],
  });

  const [$pos, $val, $size, $mode] = $element.querySelectorAll(".panel-footer > *");

  return {
    $element,
    $index: $element.querySelector(".panel-body > *"),
    $body: $element.querySelector(".panel-body"),
    $pos,
    $val,
    $mode,
    $size,
    ascii,
    bin,
    hex,
  };
}

function normalizeSelectionRange(baseOffset, extentOffset, charsPerByte = 1) {
  const start = Math.min(baseOffset, extentOffset);
  const end = Math.max(baseOffset, extentOffset);
  return [Math.floor(start / charsPerByte), Math.ceil(end / charsPerByte)];
}

export class HexEditor extends EventTarget {
  constructor(lineWidth = 16) {
    super();
    bindClassMethods(this);

    this.lineWidth = lineWidth;
    this.insertMode = true;
    this.fileName = "";
    this.selectionStartOffset = 0;
    this.selectionEndOffset = 0;
    this.buffer = new DataBuffer();
    this.editor = $editor(this.lineWidth, this.buffer);
    this.$element = this.editor.$element;
    this.views = { bin: true, hex: true, ascii: true };

    const { $mode, $body, ascii, hex, bin } = this.editor;
    highlight("selection", [ascii.selectionRange, hex.selectionRange, bin.selectionRange]);
    bindAll($body, { scroll: this.moveWindowOnScroll });
    bindAll(bin.$element, { beforeinput: this.onBeforeInput });
    bindAll(hex.$element, { beforeinput: this.onBeforeInput });
    bindAll(ascii.$element, { beforeinput: this.onBeforeInput });
    bindAll(bin, { selectionchange: this.onSelectionChange });
    bindAll(hex, { selectionchange: this.onSelectionChange });
    bindAll(ascii, { selectionchange: this.onSelectionChange });
    bindAll($mode, { click: this.switchMode });
    this.switchMode();
  }

  moveWindowOnScroll() {
    const { ascii, hex, bin, $body } = this.editor;
    ascii.scrollTop = $body.scrollTop;
    hex.scrollTop = $body.scrollTop;
    bin.scrollTop = $body.scrollTop;
  }

  getBuffer() {
    return this.buffer.getBuffer();
  }

  updateSelection(base, extent = base) {
    const { buffer } = this;
    this.selectionStartOffset = Math.min(base, extent);
    this.selectionEndOffset = Math.max(base, extent);

    const { $pos, $val, ascii, hex, bin } = this.editor;

    const collapsed = Math.abs(base - extent) < 2;
    $pos.innerText = `${collapsed ? "pos" : "start"}: ${displayValue(this.selectionStartOffset)}`;
    $val.innerText = this.selectionStartOffset < buffer.length ? (
      this.selectionEndOffset !== this.selectionStartOffset
        ? `sel: ${displayValue(this.selectionEndOffset - this.selectionStartOffset)}`
        : `val: ${displayValue(buffer.at(this.selectionStartOffset))}`
    ) : "";

    ascii.setSelection(this.selectionStartOffset, this.selectionEndOffset);
    hex.setSelection(this.selectionStartOffset * 2, this.selectionEndOffset * 2);
    bin.setSelection(this.selectionStartOffset * 8, this.selectionEndOffset * 8);

    this.dispatchEvent(new CustomEvent("select", { detail: {
      buffer,
      startOffset: this.selectionStartOffset,
      endOffset: this.selectionEndOffset,
      length: this.selectionEndOffset - this.selectionStartOffset,
    } }));
  }

  normalizeInput(text, inputType, offset) {
    const { buffer, insertMode, editor: { hex, bin, ascii } } = this;
    const activeWindow = inputType === "hex" ? hex : inputType === "bin" ? bin : ascii;
    const { charsPerByte } = activeWindow;
    let caret = offset;
    if (!text) return [undefined, caret];

    if (inputType === "text") {
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
    const { bin, hex, ascii } = this.editor;

    const activeWindow = $node === hex.$textNode ? hex : $node === bin.$textNode ? bin : ascii;
    let [startOffset, endOffset] = normalizeSelectionRange(baseOffset, extentOffset, activeWindow.charsPerByte);

    switch (e.inputType) {
      case "insertFromDrop":
      case "insertFromPaste":
      case "insertText": {
        const data = activeWindow === ascii ? e.data : e.data?.replace(/\s+/gm, "");
        const [chunk, caretOffset] = this.normalizeInput(data, activeWindow === hex ? "hex" : activeWindow === bin ? "bin" : "text", Math.min(baseOffset, extentOffset));
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
    const { hex, ascii, bin } = this.editor;
    const activeWindow = focusNode === hex.$textNode ? hex : focusNode === bin.$textNode ? bin : ascii;
    const [start, end] = normalizeSelectionRange(startOffset, endOffset, activeWindow.charsPerByte);

    this.updateSelection(start, end);
  }

  switchMode() {
    const { $mode } = this.editor;
    this.insertMode = !this.insertMode;
    $mode.innerText = this.insertMode ? "INS" : "OVR";
  }

  setBuffer(buf) {
    const { buffer } = this;
    buffer.from(buf);
    const { $size, hex, ascii, bin, $index } = this.editor;

    $size.innerText = `size: ${displayValue(buffer.length)}`;

    $index.innerText = new Array(Math.ceil(buffer.length / this.lineWidth)).fill(0)
      .map((_, i) => (i * this.lineWidth)
        .toString(16)
        .padStart(6, 0))
      .join("\n");

      this.dispatchEvent(new CustomEvent("load", { detail: { buffer: buffer.getBuffer() } }));

      hex.render();
      bin.render();
      ascii.render();
      this.setSelection(0);
  }

  setSelection(start, end = start) {
    const { $body } = this.editor;
    $body.scrollTop = Math.floor(start / this.lineWidth) * 20;
    this.updateSelection(start, end);
  }

  getFileName() {
    return this.fileName ?? "data.bin";
  }

  openFile(buf, name) {
    this.fileName = name;
    this.setBuffer(buf);
  }

  toggleView(name) {
    if(name in this.views) {
      const visible = !this.views[name];
      this.views[name] = visible;

      Array
        .from(document.querySelectorAll(`.col-${name}`))
        .map($el => $el.style.display = visible ? "block" : "none");
    }
  }
}

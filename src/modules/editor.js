import { $, bindAll } from "../dom.js";
import { $panel } from "../components/panel.js";
import { highlight, setCaret } from "../utils/text.js";
import { DataBuffer } from "../structures/buffer.js";
import { DataWindow } from "../components/window.js";
import { bindClassMethods } from "../utils/classes.js";

const displayValue = (num) =>
  `${num.toString(16).toUpperCase()}h (${num.toString()})`;

export const isPrintableCharacter = (i) => i >= 0x20 && i < 0x7f;
const hexToU8 = (s) => parseInt(s, 16);
const charToU8 = (c) => c.charCodeAt(0);
const u8ToChar = (i) => isPrintableCharacter(i) ? String.fromCharCode(i) : '·';
const u8ToHex = (i) => i.toString(16).padStart(2, "0");

const $editor = (lineWidth = 16, getDataBuffer) => {
  const headerText = Array(lineWidth).fill(0).fill(0).map((_, i) => i.toString(16)).join("").toUpperCase();

  const ascii = new DataWindow({
    class: "col-ascii",
    spellcheck: false,
    contenteditable: "plaintext-only",
    autocomplete: "off",
    style: `width: ${lineWidth}ch`,
  }, {
    getDataBuffer,
    renderFn: (arr) => Array.from(arr).map(u8ToChar).join(""),
    charsPerByte: 1,
  });

  const hex = new DataWindow({
    class: "col-hex",
    spellcheck: false,
    contenteditable: "plaintext-only",
    autocomplete: "off",
    style: `width:  calc(${lineWidth * 2} * (1ch + var(--hex-letter-spacing)))`,
  }, {
    getDataBuffer,
    renderFn: (arr) => Array.from(arr).map(u8ToHex).join(""),
    charsPerByte: 2,
  });

  const { $element } = $panel({ class: "editor", label: "Editor" }, {
    header: [
      $.div({ class: "col-index" }, "offset"),
      $.div({ class: "col-hex" }, headerText.split("").join(" ").concat(" ")),
      $.div({ class: "col-ascii" }, headerText),
    ],
    body: [
      $.div({ class: "col-index" }),
      hex.window.$element,
      ascii.window.$element
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
    hex,
  };
}

function normalizeSelectionRange(startOffset, endOffset, charsPerByte = 1) {
  if (startOffset > endOffset) {
    const tmp = startOffset;
    startOffset = endOffset;
    endOffset = tmp;
  }

  return [Math.floor(startOffset / charsPerByte), Math.ceil(endOffset / charsPerByte)];
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
    this.editor = $editor(this.lineHeight, () => this.buffer.getBuffer());
    this.$element = this.editor.$element;

    const { $mode, $body, ascii, hex } = this.editor;
    highlight("selection", [ascii.selectionRange, hex.selectionRange]);
    bindAll($body, { scroll: this.moveWindowOnScroll });
    bindAll(hex.window.$element, { beforeinput: this.onBeforeInput });
    bindAll(ascii.window.$element, { beforeinput: this.onBeforeInput });
    bindAll(hex, { selectionchange: this.onSelectionChange });
    bindAll(ascii, { selectionchange: this.onSelectionChange });
    bindAll($mode, { click: this.switchMode });
    this.switchMode();
  }

  moveWindowOnScroll() {
    const { ascii, hex, $body } = this.editor;
    ascii.scrollTop = $body.scrollTop;
    hex.scrollTop = $body.scrollTop;
  }

  getBuffer() {
    return this.buffer.getBuffer();
  }

  updateSelection(start, end = start) {
    const { buffer } = this;
    this.selectionStartOffset = Math.min(start, end);
    this.selectionEndOffset = Math.max(start, end);

    const { $pos, $val, ascii, hex } = this.editor;

    const collapsed = start === end;
    $pos.innerText = `${collapsed ? "pos" : "start"}: ${displayValue(this.selectionStartOffset)}`;
    $val.innerText = this.selectionStartOffset < buffer.length ? (
      this.selectionEndOffset !== this.selectionStartOffset
        ? `sel: ${displayValue(this.selectionEndOffset - this.selectionStartOffset)}`
        : `val: ${displayValue(buffer.at(this.selectionStartOffset))}`
    ) : "";

    ascii.setSelection(start, end);
    hex.setSelection(start, end);

    this.dispatchEvent(new CustomEvent("select", { detail: {
      buffer,
      startOffset: this.selectionStartOffset,
      endOffset: this.selectionEndOffset,
      length: this.selectionEndOffset - this.selectionStartOffset,
    } }));
  }

  normalizeInput(text, inputType, offset) {
    if(!text) return undefined;
    const { buffer, insertMode } = this;

    switch (inputType) {
      case "text":
        return text.split("").map(charToU8);
      case "hex":
        if (!text.match(/^[0-9a-f]*$/i)) return undefined;
        if (offset % 2 !== 0) {
          const firstByte = u8ToHex(buffer.at(Math.floor(offset / 2)));
          text = firstByte[0].concat(text);
        }
        if (text.length % 2 !== 0) {
          const lastByte = u8ToHex(buffer.at(Math.floor((offset + text.length) / 2)));
          text = text.concat(insertMode ? "0" : lastByte[1]);
        }
        return text.match(/.{2}/g).map(hexToU8);
      default: throw new Error(`Unknown input type ${inputType}`);
    }
  }

  onBeforeInput(e) {
    e.preventDefault();
    const { baseOffset, extentOffset, baseNode: $node, extentNode } = document.getSelection();
    if ($node !== extentNode) return;
    const { hex, ascii } = this.editor;

    const window = $node === hex.window.$textNode ? hex : ascii;
    const charsPerByte = window === hex ? 2 : 1;
    let [startOffset, endOffset] = normalizeSelectionRange(baseOffset, extentOffset, charsPerByte);

    switch (e.inputType) {
      case "insertFromDrop":
      case "insertFromPaste":
      case "insertText": {
        const data = window === hex ? e.data?.replace(/\s+/gm, "") : e.data;
        const chunk = this.normalizeInput(data, window === hex ? "hex" : "text", Math.min(baseOffset, extentOffset));
        if (!chunk) return;

        if (this.insertMode) {
          this.buffer.insert(chunk, startOffset, endOffset);
        } else {
          if (startOffset + chunk.length > this.buffer.length) return;
          this.buffer.set(chunk, startOffset);
        }
        setCaret($node, Math.min(baseOffset, extentOffset) + data.length);
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
        if (this.insertMode) {
          this.buffer.delete(startOffset, endOffset - startOffset);
        } else {
          const chunk = new Uint8Array(Array(Math.max(endOffset - startOffset, 1)).fill(0));
          this.buffer.set(chunk, startOffset);
          caretOffset = direction > 0 ? endOffset : startOffset;
        }
        setCaret($node, caretOffset * charsPerByte);
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
    const { hex, ascii } = this.editor;
    let [start, end] = normalizeSelectionRange(startOffset, endOffset);
    if (start === end && !this.insertMode) {
      end = start + 1;
    }
    this.updateSelection(start, end, focusNode === hex.window.$textNode ? hex : ascii);
  }

  switchMode() {
    const { $mode } = this.editor;
    this.insertMode = !this.insertMode;
    $mode.innerText = this.insertMode ? "INS" : "OVR";
  }

  setBuffer(buf) {
    const { buffer } = this;
    buffer.from(buf);
    const { $size, hex, ascii, $index } = this.editor;

    $size.innerText = `size: ${displayValue(buffer.length)}`;

    $index.innerText = new Array(Math.ceil(buffer.length / this.lineWidth)).fill(0)
      .map((_, i) => (i * this.lineWidth)
        .toString(16)
        .padStart(6, 0))
      .join("\n");

      this.dispatchEvent(new CustomEvent("load", { detail: { buffer: buffer.getBuffer() } }));

      hex.render();
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
}

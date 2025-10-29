import { CustomElement } from "../dom.js";
import { range, getCaret, setCaret } from "../utils/text.js";
import { normalizeNumber, normalizeSelectionOffsets } from "../utils/numbers.js";

function isRemoveAction(inputType) {
  return inputType.startsWith("delete");
}

function isInsertAction(inputType) {
  return inputType.startsWith("insert");
}

function getInputDirection(inputType) {
  return inputType.includes("Backward") ? -1 : 1;
}

export class DataWindow extends CustomElement {
  constructor({ editor, renderByte, toByte, inputRegex, charsPerByte } = {}) {
    super();

    this.editor = editor;
    this.renderByte = renderByte;
    this.toByte = toByte;
    this.inputRegex = inputRegex;
    this.charsPerByte = charsPerByte;
    this.skipSelectionHandler = false;

    this.$textNode = document.createTextNode(" ");
    this.appendChild(this.$textNode);
    this.selectionRange = range(this.$textNode, 0, 0);

    this.classList.add("window", "notranslate");
    this.style.setProperty("width", `${this.lineWidth * this.charsPerByte + 0.2}ch`);
    this.setAttribute("spellcheck", false);
    this.setAttribute("contenteditable", "plaintext-only");
    this.setAttribute("autocomplete", "off");

    this._events = [
      [document, { "selectionchange": this.onSelectionChange.bind(this) }, false],
      [this, {
        "beforeinput": this.onBeforeInput.bind(this),
        "keydown": this.onKeyDown.bind(this),
      }, false],
    ];
  }

  render(buffer) {
    this.skipSelectionHandler = true;
    const { renderByte, $textNode } = this;
    $textNode.data = Array.from(buffer.subarray(0)).map(renderByte).join("");
    this.skipSelectionHandler = false;
  }

  onSelectionChange() {
    const { skipSelectionHandler, charsPerByte, $textNode, editor } = this;
    if (skipSelectionHandler) return;
    let { focusNode, baseOffset, extentOffset } = document.getSelection();
    if (focusNode !== $textNode) return;

    const { viewOffsetStart } = editor;
    this.trigger("windowselectionchange", {
      focusNode,
      startOffset: viewOffsetStart + Math.floor(baseOffset / charsPerByte),
      endOffset: viewOffsetStart + Math.ceil(extentOffset / charsPerByte)
    });
  }

  validateInput(text) {
    return text.match(this.inputRegex);
  }

  handleDelete(direction, offsets) {
    const { editor } = this;
    const { mode, buffer } = editor;
    let { bufferOffsetStart, bufferOffsetEnd } = offsets;

    if (bufferOffsetStart === bufferOffsetEnd) {
      if (direction < 0) bufferOffsetStart--;
      else bufferOffsetEnd++;
    }

    const bytesToDelete = bufferOffsetEnd - bufferOffsetStart;
    let caret = bufferOffsetStart;
    if (mode === "insert") {
      if (bufferOffsetStart < 0 || bufferOffsetStart > buffer.length - bytesToDelete) return;
      buffer.delete(bufferOffsetStart, bytesToDelete);
    } else {
      if (bufferOffsetStart < 0 || bufferOffsetEnd > buffer.length) return;
      buffer.set(new Uint8Array(Array(bytesToDelete).fill(0)), bufferOffsetStart);
      if (direction > 0) caret = bufferOffsetEnd;
    }

    this.setCaret(caret);
  }

  handleInsert(text, offsets) {
    let { bufferOffsetStart, subByteOffsetStart, bufferOffsetEnd } = offsets;
    const { editor, charsPerByte, toByte, renderByte } = this;
    const { mode, buffer } = editor;

    let chunk;
    let caret;
    if (charsPerByte === 1) {
      caret = [bufferOffsetStart + text.length];
      chunk = text.split("").map(toByte);
    } else {
      caret = [
        bufferOffsetStart + Math.floor(text.length / charsPerByte),
        subByteOffsetStart + text.length % charsPerByte,
      ];

      if (subByteOffsetStart !== 0) {
        const byte = renderByte(buffer.at(bufferOffsetStart));
        text = byte.substring(0, subByteOffsetStart % charsPerByte).concat(text);
        subByteOffsetStart = 0;
      } // First byte now included in text

      if (text.length % charsPerByte !== 0) {
        if (mode === "insert") {
          text = text.concat(new Array(charsPerByte - text.length % charsPerByte).fill('0').join(""));
        } else {
          const lastByteOffset = bufferOffsetStart + Math.floor(text.length / charsPerByte);
          if (lastByteOffset >= buffer.length) return;
          const lastByte = renderByte(buffer.at(lastByteOffset));
          text = text.concat(lastByte.substring(text.length % charsPerByte));
        }
      } // Last byte now included in text

      chunk = text.match(new RegExp(`.{${Number(charsPerByte)}}`, "g")).map(toByte);
    }

    if (!chunk) return;

    if (mode === "insert") {
      buffer.insert(chunk, bufferOffsetStart, bufferOffsetEnd);
    } else {
      if (bufferOffsetStart + chunk.length > buffer.length) return;
      buffer.set(chunk, bufferOffsetStart);
    }

    this.setCaret(...caret);
  }

  onBeforeInput(e) {
    e.stopImmediatePropagation();
    e.preventDefault();

    const { baseOffset, extentOffset, baseNode, extentNode } = document.getSelection();
    if (baseNode !== extentNode) return;
    if (isInsertAction(e.inputType) && !this.validateInput(e.data)) return;

    const offsets = this.getSelectionOffsets(baseOffset, extentOffset);

    if (isRemoveAction(e.inputType)) {
      const direction = getInputDirection(e.inputType);
      return this.handleDelete(direction, offsets);
    }
    else if (isInsertAction(e.inputType)) {
      const { charsPerByte } = this;
      const text = (charsPerByte === 1) ? e.data : e.data.replace(/\s+/gm, "");
      return this.handleInsert(text, offsets);
    }
    else alert(`Unknown input type "${e.inputType}"`);
  }

  onKeyDown(e) {
    const { editor, $textNode, charsPerByte } = this;
    const { viewOffsetStart, lineWidth, numLines } = editor;

    const keyToOffset = {
      33: -numLines * lineWidth, // PgUp
      34: numLines * lineWidth,  // PgDn
      37: -1,                    // Left
      39: 1,                     // Right
      38: -lineWidth,            // Up
      40: lineWidth              // Down
    }

    const offset = keyToOffset[e.which];
    if (offset) {
      const caretPosition = getCaret($textNode);
      const bytesFloat = caretPosition / charsPerByte;
      if (offset + bytesFloat > 0 && offset + bytesFloat < charsPerByte * lineWidth * numLines) return;

      e.preventDefault();
      const byteOffset = viewOffsetStart + offset + Math.floor( caretPosition / charsPerByte);
      const subByteOffset = caretPosition % charsPerByte;
      if (byteOffset < 0) {
        this.setCaret(0);
      } else if (byteOffset + (subByteOffset ? 1 : 0) > editor.buffer.length) {
        this.setCaret(editor.buffer.length);
      } else {
        this.setCaret(byteOffset, subByteOffset);
      }
    }
  }

  /**
   * @param {number} byteOffsetStart
   * @param {number} byteOffsetEnd
   */
  setSelection(byteOffsetStart, byteOffsetEnd) {
    const { charsPerByte, $textNode, selectionRange, editor } = this;
    const { viewOffsetStart } = editor;

    const [start, end] = normalizeSelectionOffsets(
      (byteOffsetStart - viewOffsetStart) * charsPerByte,
      (byteOffsetEnd - viewOffsetStart) * charsPerByte,
    );

    this.skipSelectionHandler = true;
    selectionRange.setStart($textNode, normalizeNumber(start, 0, $textNode.data.length));
    selectionRange.setEnd($textNode, normalizeNumber(end, 0, $textNode.data.length));
    this.skipSelectionHandler = false;
  }

  /**
   * @param {number} byteOffset
   * @param {number} [subByteOffset]
   */
  setCaret(byteOffset, subByteOffset = 0) {
    const { charsPerByte, $textNode, editor } = this;
    const { viewOffsetStart } = editor;
    editor.scrollIntoView(byteOffset + Math.ceil(subByteOffset));
    const scrollDiff = viewOffsetStart - editor.viewOffsetStart;
    const caretPosition = (byteOffset - viewOffsetStart + scrollDiff) * charsPerByte + subByteOffset;
    setCaret($textNode, caretPosition);
  }

  getSelectionOffsets(o1, o2) {
    const [start, end] = normalizeSelectionOffsets(o1, o2);
    const { editor: { viewOffsetStart }, charsPerByte } = this;

    return {
      bufferOffsetStart: viewOffsetStart + Math.floor(start / charsPerByte),
      bufferOffsetEnd: viewOffsetStart + Math.ceil(end / charsPerByte),
      subByteOffsetStart: start % charsPerByte,
      subByteOffsetEnd: end % charsPerByte,
    };
  }
}
customElements.define("hv-window", DataWindow);

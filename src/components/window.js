import { $, bindAll, cn } from "../dom.js";
import { bindClassMethods } from "../utils/classes.js";
import { range } from "../utils/text.js";

export class DataWindow extends EventTarget {
  constructor(attributes = {}, { buffer, renderByte } = {}) {
    super();
    bindClassMethods(this);
    this.buffer = buffer;
    this.renderByte = renderByte;
    this.charsPerByte = renderByte(0).length;

    this.$textNode = document.createTextNode(" ");
    this.$element = $.div({
      ...attributes,
      spellcheck: false,
      contenteditable: "plaintext-only",
      autocomplete: "off",
      class: cn("window", attributes.class)
    }, [this.$textNode]);

    this.selectionRange = range(this.$textNode, 0, 0);
    this.skipSelectionHandler = false;
    document.addEventListener("selectionchange", this.onSelectionChange);

    bindAll(buffer, {
      overwrite: this.onBufferChange,
      insert: this.onBufferChange,
      delete: this.onBufferChange,
    })
  }

  onBufferChange({ detail, type }) {
    const { startOffset, endOffset, length } = detail;

    const { renderByte, $textNode, buffer, charsPerByte } = this;

    if (endOffset === buffer.length && startOffset === 0) {
      this.render();
      return;
    }

    const text = Array.from(buffer.subarray(startOffset, startOffset + length)).map(renderByte).join("");
    switch (type) {
      case "overwrite": {
        this.skipSelectionHandler = true;
        $textNode.replaceData(startOffset * charsPerByte, length * charsPerByte, text);
        this.skipSelectionHandler = false;
        return;
      }
      case "delete":
      case "insert": {
        this.skipSelectionHandler = true;
        $textNode.replaceData(startOffset * charsPerByte, (endOffset - startOffset) * charsPerByte, text);
        this.skipSelectionHandler = false;
        return;
      }
    }
  }

  render() {
    this.skipSelectionHandler = true;
    const { renderByte, buffer, $textNode } = this;
    $textNode.data = Array.from(buffer.subarray(0)).map(renderByte).join("")
    this.skipSelectionHandler = false;
  }

  /**
   * @param {number} offset
   */
  set scrollTop(offset) {
    this.$element.scrollTop = `${offset}px`;
  }

  onSelectionChange() {
    if(this.skipSelectionHandler) return;
    let { focusNode, baseOffset, extentOffset } = document.getSelection();
    if (focusNode !== this.$textNode) return;

    const detail = {
      focusNode,
      startOffset: baseOffset,
      endOffset: extentOffset
    };

    this.dispatchEvent(new CustomEvent("selectionchange", { detail }));
  }

  /**
   * @param {number} start
   * @param {number} end
   */
  setSelection(start, end) {
    const { selectionRange, $textNode } = this;
    selectionRange.setStart($textNode, Math.min(start, end));
    selectionRange.setEnd($textNode, Math.max(start, end));
  }
}

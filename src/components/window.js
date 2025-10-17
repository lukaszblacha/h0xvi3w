import { CustomElement } from "../dom.js";
import { range } from "../utils/text.js";

export class DataWindow extends CustomElement {
  constructor({ buffer, renderByte } = {}) {
    super({});

    this.onBufferChange = this.onBufferChange.bind(this);
    this.onSelectionChange = this.onSelectionChange.bind(this);

    this.buffer = buffer;
    this.renderByte = renderByte;
    this.charsPerByte = renderByte(0).length;
    this.skipSelectionHandler = false;

    this.$textNode = document.createTextNode(" ");
    this.appendChild(this.$textNode);
    this.selectionRange = range(this.$textNode, 0, 0);

    this.classList.add("window", "notranslate");
    this.setAttribute("spellcheck", false);
    this.setAttribute("contenteditable", "plaintext-only");
    this.setAttribute("autocomplete", "off");

    this._events = [
      [document, { "selectionchange": this.onSelectionChange }],
      [this.buffer, {
        overwrite: this.onBufferChange,
        insert: this.onBufferChange,
        delete: this.onBufferChange,
      }]
    ];
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

  onSelectionChange() {
    if(this.skipSelectionHandler) return;
    let { focusNode, baseOffset, extentOffset } = document.getSelection();
    if (focusNode !== this.$textNode) return;

    this.trigger("selectionchange", {
      focusNode,
      startOffset: baseOffset,
      endOffset: extentOffset
    });
  }

  /**
   * @param {number} start
   * @param {number} end
   */
  setSelection(start, end) {
    if (end > this.$textNode.data.length) return;
    const { selectionRange, $textNode } = this;
    selectionRange.setStart($textNode, Math.min(start, end));
    selectionRange.setEnd($textNode, Math.max(start, end));
  }
}
customElements.define("hv-window", DataWindow);

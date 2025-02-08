import { $, cn } from "../dom.js";
import { bindClassMethods } from "../utils/classes.js";
import { range } from "../utils/text.js";

const $window = (attributes = {}) => {
  const $textNode = document.createTextNode("");
  const $element = $.div({ ...attributes, class: cn("window", attributes.class) }, [$textNode]);

  return { $element, $textNode };
}

export class DataWindow extends EventTarget {
  constructor(attributes = {}, { getDataBuffer, renderFn, charsPerByte } = {}) {
    super();
    bindClassMethods(this);
    this.getDataBuffer = getDataBuffer;
    this.renderFn = renderFn;
    this.charsPerByte = charsPerByte;
    this.window = $window(attributes);
    this.selectionRange = range(this.window.$textNode, 0, 0);
    this.skipSelectionHandler = false;
    document.addEventListener("selectionchange", this.onSelectionChange);

    this.render();
  }

  render() {
    this.skipSelectionHandler = true;
    const { $textNode } = this.window;
    const { renderFn, getDataBuffer } = this;
    const b = getDataBuffer();
    $textNode.data = renderFn(b);
    this.skipSelectionHandler = false;
  }

  /**
   * @param {number} offset
   */
  set scrollTop(offset) {
    const { $element } = this.window;
    $element.scrollTop = `${offset}px`;
  }

  onSelectionChange() {
    if(this.skipSelectionHandler) return;
    let { focusNode, baseOffset: start, extentOffset: end } = document.getSelection();
    const { charsPerByte } = this;
    if (focusNode !== this.window.$textNode) return;

    const detail = {
      focusNode,
      startOffset: Math.floor(start / charsPerByte),
      endOffset: Math.ceil(end / charsPerByte)
    };

    this.setSelection(detail.startOffset, detail.endOffset);
    this.dispatchEvent(new CustomEvent("selectionchange", { detail }));
  }

  /**
   * @param {number} start
   * @param {number} end
   */
  setSelection(start, end) {
    const { selectionRange, charsPerByte } = this;
    const { $textNode } = this.window;
    selectionRange.setStart($textNode, start * charsPerByte);
    selectionRange.setEnd($textNode, end * charsPerByte);
  }
}

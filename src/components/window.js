import { $, cn } from "../dom.js";
import { bindClassMethods } from "../utils/classes.js";
import { range, setSelection } from "../utils/text.js";

// FIXME: hex changes offset on scroll
// FIXME: optimize scroll up
// FIXME: add selection listener (incl cmd+a)

const $window = (outerAttrs = {}, attributes = {}) => {
  const $textNode = document.createTextNode("");
  const $element = $.div(attributes, [$textNode]);
  const $outer = $.div({ ...outerAttrs, class: cn("window", outerAttrs.class) }, [$element]);

  return { $outer, $element, $textNode };
}

export class DataWindow extends EventTarget {
  constructor(outerAttrs = {}, attributes = {}, { getDataBuffer, renderFn, charsPerByte = 1 } = {}) {
    super();
    bindClassMethods(this);
    this.getDataBuffer = getDataBuffer;
    this.renderFn = renderFn;
    this.charsPerByte = charsPerByte;
    this.window = $window(outerAttrs, attributes);
    this.lineHeight = 20; // TODO:
    this.startOffset = 0;
    this.endOffset = 0;
    this.selectionRange = range(this.window.$textNode, 0, 0);
    this.realSelection = { start: 0, end: 0 };
    this.skipSelectionHandler = false;
    document.addEventListener("selectionchange", this.onSelectionChange);

    this.render();
  }

  render() {
    cancelAnimationFrame(this.afRid);
    this.afRid = requestAnimationFrame(() => {
      this.skipSelectionHandler = true;
      const { $textNode, $element } = this.window;
      const { renderFn, getDataBuffer, startOffset, endOffset, selectionRange } = this;
      const { focusNode } = document.getSelection();

      $element.blur();
      const b = getDataBuffer().subarray(startOffset, endOffset);
      $textNode.data = renderFn(b);
      this.renderSelection();

      const { start, end } = this.windowSelection || {};
      if (start !== undefined && end !== undefined) {
        selectionRange.setStart($textNode, start);
        selectionRange.setEnd($textNode, end);
        if (focusNode === $textNode) {
          setSelection($textNode, start, end);
        }
      }
      setTimeout(() => this.skipSelectionHandler = false, 1);
    });
  }

  renderSelection() {
    const { selectionRange } = this;
    const { $textNode } = this.window;
    const { start, end } = this.windowSelection || {};
    if (start !== undefined && end !== undefined) {
      selectionRange.setStart($textNode, start);
      selectionRange.setEnd($textNode, end);
    }
  }

  /**
   * @param {number} offset
   */
  set scrollTop(offset) {
    cancelAnimationFrame(this.afRid);
    const { lineHeight } = this;

    const { $outer, $element } = this.window;
    $outer.style.top = `${offset - offset % lineHeight}px`;

    this.startOffset = Math.floor(offset / lineHeight) * 16;
    this.endOffset = Math.min(
      this.startOffset + Math.ceil($element.clientHeight / lineHeight) * 16,
      this.getDataBuffer().length,
    );

    this.render();
  }

  get windowSelection() {
    const { startOffset, realSelection } = this;
    const { start: realStart, end: realEnd } = realSelection;

    const [start, end] = [
      Math.max(0, (realStart - startOffset) * this.charsPerByte),
      Math.max(0, (realEnd - startOffset) * this.charsPerByte)
    ];

    return {
      start: Math.min(this.window.$textNode.data.length, Math.max(0, start)),
      end: Math.min(this.window.$textNode.data.length, Math.max(0, end))
    };
  }

  onSelectionChange() {
    if(this.skipSelectionHandler) return;
    // if it comes from an user - update selection based on real selection
    // if it comes from render method - ignore
    let { focusNode, baseOffset: start, extentOffset: end } = document.getSelection();
    const { charsPerByte, startOffset } = this;
    if (focusNode !== this.window.$textNode) return;
    if (start === 0 && end === 0) return;

    const detail = {
      focusNode,
      startOffset: Math.floor(startOffset+( start) / charsPerByte),
      endOffset: Math.ceil(startOffset +  ( end) / charsPerByte)
    };

    this.setSelection(detail.startOffset, detail.endOffset);
    this.dispatchEvent(new CustomEvent("selectionchange", { detail }));
  }

  /**
   * @param {number} start
   * @param {number} end
   */
  setSelection(start, end) {
    const { realSelection } = this;
    realSelection.start = start;
    realSelection.end = end;
    this.renderSelection();
  }
}

import { $, bindAll, unbindAll, debounce } from "../dom.js";
import { $panel } from "../components/panel.js";
import { bindClassMethods } from "../utils/classes.js";

function formatBinValue(value) {
  return value[0]?.toString(2).padStart(8, "0") ?? "◌";
}

function formatInt(value, bits, signed, bigEndian) {
  let numChars = Math.round(bits / 8);
  if (value.length < numChars) {
    return "◌";
  }
  const buf = value.slice(0, numChars);
  if (!bigEndian) buf.reverse();

  let val = 0n;
  for (let i in buf) {
    val = val * 256n + BigInt(buf[i]);
  }
  if (signed && val >= BigInt((2 ** bits) >> 1)) {
    val = BigInt(-(2 ** bits)) + val;
  }
  return val;
}

function formatChar(value) {
  if (value.length < 1) return "◌";
  const char = String.fromCharCode(value[0]).charAt(0);
  const hex = value[0].toString(16).toUpperCase().padStart(2,0);
  return `"${char}" ${hex}h`;
}

export class ValuesExplorer extends EventTarget {
  constructor(editor) {
    super();
    bindClassMethods(this);
    this.setValue = debounce(this.setValue, 50).bind(this);

    this.editor = editor;
    this.bigEndian = false;
    this.value = [];

    this.$bigEndian = $.div();
    this.$element = $panel(
      { class: "values-explorer", label: "Values explorer" },
      { body: [], footer: [this.$bigEndian] }
    ).$element;

    this.$body = this.$element.querySelector(".panel-body");

    bindAll(this.editor, { select: this.setValue });
    bindAll(this.$bigEndian, { click: this.switchEndianness });
    this.switchEndianness();
  }

  destroy() {
    unbindAll(this.editor, { select: this.setValue });
    unbindAll(this.$bigEndian, { click: this.switchEndianness });
  }

  render() {
    const { value, $body, bigEndian } = this;
    $body.innerText = "";

    const table = $.table({}, [
      ["bin", formatBinValue(value)],
      ["chr", formatChar(value)],
      ["i8", formatInt(value, 8, true, bigEndian)],
      ["u8", formatInt(value, 8, false, bigEndian)],
      ["i16", formatInt(value, 16, true, bigEndian)],
      ["u16", formatInt(value, 16, false, bigEndian)],
      ["i32", formatInt(value, 32, true, bigEndian)],
      ["u32", formatInt(value, 32, false, bigEndian)],
      ["i64", formatInt(value, 64, true, bigEndian)],
      ["u64", formatInt(value, 64, false, bigEndian)],
      ].map(
        ([name, value]) => $.tr({}, [$.td({}, [name]), $.td({}, [String(value)])])
      )
    );

    this.$body.appendChild(table);
  }

  switchEndianness() {
    this.bigEndian = !this.bigEndian;
    const { bigEndian, $bigEndian, render } = this;
    $bigEndian.innerText = bigEndian ? "BIG" : "LIT";
    render();
  }

  setValue(e) {
    const { startOffset } = e.detail;
    cancelAnimationFrame(this.afRid);
    this.value = this.editor.buffer.subarray(startOffset, startOffset + 8);
    this.afRid = requestAnimationFrame(this.render);
  }
}

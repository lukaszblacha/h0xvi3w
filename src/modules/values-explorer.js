import { $, bindAll, unbindAll, debounce } from "../dom.js";
import { Panel } from "../components/panel.js";

function formatBinValue(value) {
  return value[0]?.toString(2).padStart(8, "0") ?? "◌";
}

function updateEndiannessLabel($node, bigEndian) {
  $node.innerText = bigEndian ? "BIG" : "LIT";
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

export class ValuesExplorer extends Panel {
  static observedAttributes = ["big-endian"];

  constructor(editor) {
    super(
      { label: "Values explorer" },
      { body: [], footer: [] }
    );

    this.setValue = this.setValue.bind(this);
    this.switchEndianness = this.switchEndianness.bind(this);
    this.render = this.render.bind(this);
    this.setValue = debounce(this.setValue, 30);

    this.editor = editor;
    this.value = [];
  }

  connectedCallback() {
    super.connectedCallback();

    this.$body = this.querySelector(".panel-body");
    this.$bigEndian = $("div");
    this.querySelector(".panel-footer").appendChild(this.$bigEndian);
    updateEndiannessLabel(this.$bigEndian, this.getAttribute("big-endian") === "true");

    bindAll(this.editor, { select: this.setValue });
    bindAll(this.$bigEndian, { click: this.switchEndianness });
    this.render();
  }

  disconnectedCallback() {
    unbindAll(this.editor, { select: this.setValue });
    unbindAll(this.$bigEndian, { click: this.switchEndianness });
    this.$body = null;
    this.$bigEndian.parentNode.removeChild(this.$bigEndian);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    switch (name) {
      case "big-endian": {
        updateEndiannessLabel(this.$bigEndian, newValue === "true");
        this.render();
        break;
      }
      default: return;
    }
  }

  render() {
    const { value } = this;
    const bigEndian = this.getAttribute("big-endian") === "true";
    const table = $("table", {}, [
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
        ([name, value]) => $("tr", {}, [
          $("td", {}, [name]),
          $("td",{}, [String(value)])
        ])
      )
    );

    this.$body.innerText = "";
    this.$body.appendChild(table);
  }

  switchEndianness() {
    this.setAttribute(
      "big-endian",
      !(this.getAttribute("big-endian") === "true")
    );
  }

  setValue(e) {
    const { startOffset } = e.detail;
    cancelAnimationFrame(this.afRid);
    this.value = this.editor.buffer.subarray(startOffset, startOffset + 8);
    this.afRid = requestAnimationFrame(this.render);
  }
}
customElements.define("hv-values-explorer", ValuesExplorer);

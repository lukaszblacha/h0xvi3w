import { $, bindAll, debounce } from "../dom.js";
import { $panel } from "../components/panel.js";

export const $valuesExplorer = (editor) => {
  let value = [];
  let bigEndian = true;
  let $body = $.div();
  let afRid;

  const { $element } = $panel({ class: "values-explorer", label: "Values explorer" }, { body: [$body] });

  function formatBinValue() {
    return value[0]?.toString(2).padStart(8, "0") ?? "◌";
  }
  
  function formatInt(bits, signed) {
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

  function formatChar() {
    if (value.length < 1) return "◌";
    const char = String.fromCharCode(value[0]).charAt(0);
    const hex = value[0].toString(16).toUpperCase().padStart(2,0);
    return `"${char}" ${hex}h`;
  }

  const render = () => {
    $body.innerText = "";

    const table = $.table({}, [
      ["bin", formatBinValue()],
      ["chr", formatChar()],
      ["i8", formatInt(8, true)],
      ["u8", formatInt(8, false)],
      ["i16", formatInt(16, true)],
      ["u16", formatInt(16, false)],
      ["i32", formatInt(32, true)],
      ["u32", formatInt(32, false)],
      ["i64", formatInt(64, true)],
      ["u64", formatInt(64, false)],
      ].map(
        ([name, value]) => $.tr({}, [$.td({}, [name]), $.td({}, [String(value)])])
      )
    );

    $body.appendChild(table);
  }

  const setValue = debounce((e) => {
    const { startOffset } = e.detail;
    cancelAnimationFrame(afRid)
    value = editor.buffer.subarray(startOffset, startOffset + 8);
    afRid = requestAnimationFrame(render);
  }, 50);

  bindAll(editor, { select: setValue });

  return {
    $element,
    setBigEndian(v) {
      if (v !== bigEndian) {
        bigEndian = v;
        setValue(value);
      }
    },
  };
}

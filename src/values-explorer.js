import { $div, $table, $td, $tr } from "./dom.js";
import { $panel } from "./components/panel.js";

export const $valuesExplorer = (lineWidth = 16) => {
  let value = [];
  let bigEndian = true;
  let $body = $div();
  let afRid;

  const { $element } = $panel({
    header: ["Values explorer"],
    body: [$body],
  }, { class: "values-explorer" });

  const formatBinValue = () => value[0]?.toString(2).padStart(8, "0") ?? "◌";
  
  const formatInt = (bits, signed) => {
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
  };

  const render = () => {
    $body.innerText = "";

    const table = $table({}, [
      ["bin", formatBinValue()],
      ["i8", formatInt(8, true)],
      ["u8", formatInt(8, false)],
      ["i16", formatInt(16, true)],
      ["u16", formatInt(16, false)],
      ["i32", formatInt(32, true)],
      ["u32", formatInt(32, false)],
      ["i64", formatInt(64, true)],
      ["u64", formatInt(64, false)],
      ].map(
        ([name, value]) => $tr({}, [$td({}, [name]), $td({}, [String(value)])])
      )
    );

    $body.appendChild(table);
  }

  return {
    $element,
    setBigEndian: (v) => {
      if (v !== bigEndian) {
        bigEndian = v;
        setValue(value);
      }
    },
    setValue: (newValue, index) => { // Takes Uint8Array of size 0-128?
      cancelAnimationFrame(afRid)
      value = newValue.slice(index, index + 8);
      afRid = requestAnimationFrame(render);
    }
  };
}

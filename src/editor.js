import { $div } from "./dom.js";
import { $panel } from "./components/panel.js";
import { highlight } from "./highlight.js";

const displayValue = (num) =>
  `${num.toString(16).toUpperCase()}h (${num.toString()})`;

export const $editor = (lineWidth = 16) => {
  const $index = $div({ class: "col-index" });
  const $hex = $div({
    class: "col-hex",
    style: `width:  calc(${lineWidth * 2} * (1ch + var(--hex-letter-spacing)))`,
    spellcheck: false,
    contenteditable: true,
    autocomplete: "off"
  });
  const $text = $div({
    class: "col-ascii",
    style: `width: ${lineWidth}ch`,
    spellcheck: false,
    contenteditable: true,
    autocomplete: "off"
  });
  const $pos = $div();
  const $val = $div();
  const $size = $div();

  const headerText = Array(lineWidth).fill(0).fill(0).map((_, i) => i.toString(16)).join("").toUpperCase();
  const { $element } = $panel({
      header: [
        $div({ class: "col-index" }, "offset"),
        $div({ class: "spacer" }),
        $div({ class: "col-hex" }, headerText),
        $div({ class: "spacer" }),
        $div({ class: "col-ascii" }, headerText),
      ],
      body: [$index, $div({ class: "spacer" }), $hex, $div({ class: "spacer" }), $text],
      footer: [$pos, $val, $size],
    },
    { class: "editor" },    
  );

  let pos1, pos2 = 0;
  let data = new Uint8Array([]);
  let handlers = {
    'select': []
  };

  const setCursor = (p1, p2 = p1) => {
    pos1 = Math.min(p1, p2);
    pos2 = Math.max(p1, p2);
    $pos.innerText = data.length ? `pos: ${displayValue(pos1)}` : "";
    $val.innerText = data.length && pos1 < data.length ? (
      pos2 !== pos1 ? `sel: ${displayValue(pos2 - pos1)}` : `val: ${displayValue(data[pos1])}`
    ) : "";

    highlight("selection", [
      [$hex.firstChild, pos1 * 2, pos2 * 2],
      [$text.firstChild, pos1, pos2]
    ]);

    handlers.select.forEach(f => f(data, pos1, pos2));
  }

  function onSelectionChange(e) {
    const s = document.getSelection();
    const { baseOffset, extentOffset, baseNode, extentNode } = s;

    if (baseNode !== extentNode) {
      return;
    }

    if (baseNode === $hex.firstChild) {
      setCursor(Math.floor(baseOffset / 2), Math.floor(extentOffset / 2));
    } else if (baseNode === $text.firstChild) {
      setCursor(baseOffset, extentOffset);
    }
  }

  return {
    $element,
    on: (event, handler) => handlers[event].push(handler),
    off: (event, handler) => handlers[event].filter(v => v !== handler),
    setData: (newData) => { // Takes Uint8Array
      document.removeEventListener('selectionchange', onSelectionChange);
      data = newData;
      const hex = [], text = [];
      data.forEach(i => {
        hex.push(i.toString(16).padStart(2, '0'));
        text.push((i > 0x20 && i < 0x7f) ? String.fromCharCode(i) : '·');
      });
      $size.innerText = `size: ${displayValue(data.length)}`;
      $hex.innerText = hex.join("");
      $text.innerText = text.join("");
      $index.innerText = new Array(Math.ceil(data.length / lineWidth)).fill(0)
        .map((_, i) => (i * lineWidth)
          .toString(16)
          .padStart(6, 0))
        .join("\n");

      document.addEventListener('selectionchange', onSelectionChange);
      setCursor(0);
    }
  };
}

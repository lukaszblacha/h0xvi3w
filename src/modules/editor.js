import { $div, bindAll, unbindAll } from "../dom.js";
import { $panel } from "../components/panel.js";
import { highlight, range } from "../highlight.js";

const displayValue = (num) =>
  `${num.toString(16).toUpperCase()}h (${num.toString()})`;

export const isPrintableCharacter = (i) => i >= 0x20 && i < 0x7f;
const hexToU8 = (s) => parseInt(s, 16);
const u8ToChar = (i) => isPrintableCharacter(i) ? String.fromCharCode(i) : '·';
const char2U8 = (c) => c.charCodeAt(0);

export const $editor = (lineWidth = 16) => {
  const headerText = Array(lineWidth).fill(0).fill(0).map((_, i) => i.toString(16)).join("").toUpperCase();
  const { $element } = $panel({
      header: [
        $div({ class: "col-index" }, "offset"),
        $div({ class: "spacer" }),
        $div({ class: "col-hex" }, headerText),
        $div({ class: "spacer" }),
        $div({ class: "col-ascii" }, headerText),
      ],
      body: [
        $div({ class: "col-index" }),
        $div({ class: "spacer" }),
        $div({
          class: "col-hex",
          style: `width:  calc(${lineWidth * 2} * (1ch + var(--hex-letter-spacing)))`,
          spellcheck: false,
          contenteditable: "plaintext-only",
          autocomplete: "off"
        }),
        $div({ class: "spacer" }),
        $div({
          class: "col-ascii",
          style: `width: ${lineWidth}ch`,
          spellcheck: false,
          contenteditable: "plaintext-only",
          autocomplete: "off"
        })
      ],
      footer: [$div(), $div(), $div()],
    },
    { class: "editor" },    
  );

  const $body = $element.querySelector(".panel-body");
  const [$index, $hex, $text] = $element.querySelectorAll(".panel-body > :not(.spacer)");
  const [$pos, $val, $size] = $element.querySelectorAll(".panel-footer > *");

  let pos1, pos2 = 0;
  let data = new Uint8Array([]);
  
  let handlers = {
    select: [],
    load: []
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

  function onBeforeInput(e) {
    switch (e.inputType) {
      case "insertFromDrop":
      case "insertFromPaste":
      case "insertText": {
        switch(e.target) {
          case $hex: {
            if(!e.data.match(/^[0-9a-f]*$/i)) {
              e.preventDefault();
              return;
            }
          }
          case $text: {
            if (!new Array(e.data.length).fill(null).map((_, i) => e.data.charCodeAt(i)).every(isPrintableCharacter)) {
              e.preventDefault();
              return;
            }
          }
        }
        return;
      }
      case "deleteByDrag":
      case "deleteByCut":
      case "deleteContent":
      case "deleteContentForward":
      case "deleteContentBackward": {
        return;
      }
      case "historyUndo":
      case "historyRedo":
      default: {
        e.preventDefault();
        alert("Unknown input type", e.inputType);
        console.log("Unknown input type", e);
      }
    }
  }

  function onHexInput(e) {
    let r = window.getSelection().getRangeAt(0).cloneRange();
    const $node = r.startContainer;

    if (e.data) {  
      r = range($node, r.startOffset, r.startOffset + e.data.length);
      r.deleteContents();

      const dataIndex = Math.floor((r.startOffset - e.data.length) / 2);
      let fragmentLength = e.data.length + (r.startOffset % 2) + (r.startOffset - e.data.length) % 2;
      r = range(
        $node,
        dataIndex * 2,
        dataIndex * 2 + fragmentLength // overflow?
      );

      const val = r.toString().match(/.{2}/g).map(hexToU8);

      val.forEach((i, offset) => {
        data[dataIndex + offset] = i;
      });

      r = range($text.firstChild, dataIndex, dataIndex + fragmentLength / 2);
      // TODO:
      // r.deleteContents(); ??? replace 
      // $text[r.startOffset / 2] = u8ToChar(val);

    } else {
      throw new Error("TODO: Deletion not implemented");
    }
  }

  function onTextInput(e) {
    let r = window.getSelection().getRangeAt(0).cloneRange();
    const $node = r.startContainer;

    if (e.data) { 
      r = range($node, r.startOffset, r.startOffset + e.data.length);
      r.deleteContents();

      const dataIndex = r.startOffset - e.data.length;
      r = range($node, dataIndex, dataIndex + e.data.length);

      const val = r.toString().split("").map(char2U8);

      val.forEach((i, offset) => {
        data[dataIndex + offset] = i;
      });

      r = range($hex.firstChild, dataIndex * 2, dataIndex * 2 + e.data.length * 2);
      // TODO:
      // r.deleteContents(); ??? replace 
      // $hex[r.startOffset / 2] = u8ToChar(val);
      handlers.load.forEach(f => f(data));
    } else {
      throw new Error("TODO: Deletion not implemented");
    }
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
    setSelection: (pos1, pos2 = pos1) => {
      const selection = document.getSelection();
      selection.empty();
      selection.addRange(range($text.firstChild, pos1, pos2));
      $body.scrollTop = Math.floor(pos1 / lineWidth) * 20; // TODO: use line-height
    },
    setData: (newData) => { // Takes Uint8Array
      document.removeEventListener('selectionchange', onSelectionChange);
      unbindAll($hex, { beforeinput: onBeforeInput, input: onHexInput });
      unbindAll($text, { beforeinput: onBeforeInput, input: onTextInput });

      data = newData;
      const hex = [], text = [];
      data.forEach(i => {
        hex.push(i.toString(16).padStart(2, '0'));
        text.push(u8ToChar(i));
      });
      $size.innerText = `size: ${displayValue(data.length)}`;
      $hex.innerText = hex.join("");
      $text.innerText = text.join("");
      $index.innerText = new Array(Math.ceil(data.length / lineWidth)).fill(0)
        .map((_, i) => (i * lineWidth)
          .toString(16)
          .padStart(6, 0))
        .join("\n");

      bindAll($hex, { beforeinput: onBeforeInput, input: onHexInput });
      bindAll($text, { beforeinput: onBeforeInput, input: onTextInput });
      document.addEventListener('selectionchange', onSelectionChange);
      handlers.load.forEach(f => f(data));
      setCursor(0);
    }
  };
}

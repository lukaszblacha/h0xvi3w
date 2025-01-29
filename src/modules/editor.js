import { $div, bindAll } from "../dom.js";
import { $panel } from "../components/panel.js";
import { highlight, range, replaceInText, setCaret, setSelection } from "../text.js";

const displayValue = (num) =>
  `${num.toString(16).toUpperCase()}h (${num.toString()})`;

export const isPrintableCharacter = (i) => i >= 0x20 && i < 0x7f;
const hexToU8 = (s) => parseInt(s, 16);
const charToU8 = (c) => c.charCodeAt(0);
const u8ToChar = (i) => isPrintableCharacter(i) ? String.fromCharCode(i) : '·';
const u8ToHex = (i) => i.toString(16).padStart(2, "0");

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

  let selectionStartOffset =0;
  let selectionEndOffset = 0;
  let buffer = new Uint8Array([]);
  
  let handlers = {
    select: [],
    load: [],
    change: []
  };

  function trigger(eventName, event = {}) {
    handlers[eventName].forEach(callback => callback({ eventName, ...event }));
  }

  function updateSelection(selectionStart, selectionEnd = selectionStart) {
    selectionStartOffset = Math.min(selectionStart, selectionEnd);
    selectionEndOffset = Math.max(selectionStart, selectionEnd);
    $pos.innerText = buffer.length ? `pos: ${displayValue(selectionStartOffset)}` : "";
    $val.innerText = buffer.length && selectionStartOffset < buffer.length ? (
      selectionEndOffset !== selectionStartOffset ? `sel: ${displayValue(selectionEndOffset - selectionStartOffset)}` : `val: ${displayValue(buffer[selectionStartOffset])}`
    ) : "";

    highlight("selection", [
      range($hex.firstChild, selectionStartOffset * 2, selectionEndOffset * 2),
      range($text.firstChild, selectionStartOffset, selectionEndOffset)
    ]);

    trigger("select", {
      buffer,
      startOffset: selectionStartOffset,
      endOffset: selectionEndOffset,
      length: Math.abs(selectionEndOffset - selectionStartOffset),
    })
  }

  function editBuffer(startOffset, endOffset, chunk) {
    // TODO: when implementing the insert mode (as opposed to overwrite), [startOffset..endOffset] with the chunk
    chunk.forEach((v, index) => {
      buffer[startOffset + index] = v;
    });

    replaceInText($text.firstChild, chunk.map(u8ToChar).join(""), startOffset);
    replaceInText($hex.firstChild, chunk.map(u8ToHex).join(""), startOffset * 2);

    trigger("change", { buffer, startOffset, length: chunk.length });
  }

  function onBeforeInput(e) {
    const s = document.getSelection();
    const { baseOffset, extentOffset, baseNode, extentNode } = s;
    e.preventDefault();
    if (baseNode !== extentNode) return;

    switch (e.inputType) {
      case "insertFromDrop":
      case "insertFromPaste":
      case "insertText": {
        switch(e.target) {
          case $hex: {
            if(!e.data.match(/^[0-9a-f]*$/i)) {
              return;
            }

            const bufferOffset = Math.floor(baseOffset / 2);
            let hexChunk = e.data;
            // TODO: make these transformations using bit operations, not string concatenation
            if (baseOffset % 2 !== 0) {
              hexChunk = `${u8ToHex(buffer[bufferOffset])[0]}${hexChunk}`;
            }
            if (hexChunk.length % 2 !== 0) {
              hexChunk = `${hexChunk}${u8ToHex(buffer[bufferOffset + Math.floor(e.data.length / 2)])[1]}`;
            }

            editBuffer(Math.floor(baseOffset / 2), Math.floor(extentOffset / 2), hexChunk.match(/.{2}/g).map(hexToU8));
            setCaret($hex.firstChild, baseOffset + e.data.length);
            break;
          }
          case $text: {
            editBuffer(baseOffset, extentOffset, e.data.split("").map(charToU8));
            setCaret($text.firstChild, baseOffset + e.data.length)
            break;
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
        alert("Unknown input type", e.inputType);
        console.log("Unknown input type", e);
      }
    }
  }

  function onSelectionChange(e) {
    const s = document.getSelection();
    const { baseOffset, extentOffset, baseNode, extentNode } = s;

    if (baseNode !== extentNode) {
      return;
    }

    if (baseNode === $hex.firstChild) {
      updateSelection(Math.floor(baseOffset / 2), Math.floor(extentOffset / 2));
    } else if (baseNode === $text.firstChild) {
      updateSelection(baseOffset, extentOffset);
    }
  }

  bindAll($hex, { beforeinput: onBeforeInput });
  bindAll($text, { beforeinput: onBeforeInput });

  return {
    $element,
    on(event, handler) {
      handlers[event].push(handler);
    },
    off(event, handler) {
      handlers[event] = handlers[event].filter(v => v !== handler);
    },
    setSelection(startOffset, endOffset = startOffset) {
      setSelection($text.firstChild, startOffset, endOffset);
      // TODO: read line-height from the DOM
      $body.scrollTop = Math.floor(startOffset / lineWidth) * 20;
    },
    setBuffer(buf) {
      buffer = buf;
      document.removeEventListener('selectionchange', onSelectionChange);

      const hex = Array.from(buffer).map(u8ToHex);
      const text = Array.from(buffer).map(u8ToChar);
      $size.innerText = `size: ${displayValue(buffer.length)}`;
      $hex.innerText = hex.join("");
      $text.innerText = text.join("");
      $index.innerText = new Array(Math.ceil(buffer.length / lineWidth)).fill(0)
        .map((_, i) => (i * lineWidth)
          .toString(16)
          .padStart(6, 0))
        .join("\n");

      document.addEventListener('selectionchange', onSelectionChange);
      trigger("load", { buffer })
      setSelection($text.firstChild, 0);
    }
  };
}

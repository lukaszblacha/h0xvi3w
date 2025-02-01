import { $, bindAll } from "../dom.js";
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
        $.div({ class: "col-index" }, "offset"),
        $.div({ class: "spacer" }),
        $.div({ class: "col-hex" }, headerText),
        $.div({ class: "spacer" }),
        $.div({ class: "col-ascii" }, headerText),
      ],
      body: [
        $.div({ class: "col-index" }),
        $.div({ class: "spacer" }),
        $.div({
          class: "col-hex",
          style: `width:  calc(${lineWidth * 2} * (1ch + var(--hex-letter-spacing)))`,
          spellcheck: false,
          contenteditable: "plaintext-only",
          autocomplete: "off"
        }),
        $.div({ class: "spacer" }),
        $.div({
          class: "col-ascii",
          style: `width: ${lineWidth}ch`,
          spellcheck: false,
          contenteditable: "plaintext-only",
          autocomplete: "off"
        })
      ],
      footer: [$.div(), $.div(), $.div(), $.div()],
    },
    { class: "editor" },    
  );

  const $body = $element.querySelector(".panel-body");
  const [$index, $hex, $text] = $element.querySelectorAll(".panel-body > :not(.spacer)");
  const [$pos, $val, $size, $mode] = $element.querySelectorAll(".panel-footer > *");

  let selectionStartOffset = 0;
  let selectionEndOffset = 0;
  let bufferLength = 0;
  let buffer = new Uint8Array([]);
  let insertMode = true;
  let fileName;
  
  function getBuffer() {
    return buffer.subarray(0, bufferLength);
  }

  let handlers = { select: [], load: [], change: [] };
  function trigger(eventName, event = {}) {
    handlers[eventName].forEach(callback => callback({ eventName, ...event }));
  }

  function updateSelection(selectionStart, selectionEnd = selectionStart) {
    selectionStartOffset = Math.min(selectionStart, selectionEnd);
    selectionEndOffset = Math.max(selectionStart, selectionEnd);  
    const collapsed = selectionStart === selectionEnd;
    $pos.innerText = `${collapsed ? "pos" : "start"}: ${displayValue(selectionStartOffset)}`;
    $val.innerText = selectionStartOffset < bufferLength ? (
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

  function overwriteInBuffer(startOffset, data) {
    if (bufferLength < startOffset + data.length) {
      throw new Error("Content too long.");
    }
    buffer.set(data, startOffset);
    trigger("change", { buffer: getBuffer(), startOffset, endOffset: startOffset + data.length, length: data.length });
  }

  function insertInBuffer(startOffset, endOffset, data) {
    const toRemove = endOffset - startOffset;
    if (bufferLength + data.length - toRemove > buffer.length) {
      const newBuffer = new Uint8Array([
        ...buffer.subarray(0, startOffset),
        ...data,
        ...buffer.subarray(endOffset),
        ...(new Array(1024).fill(0)) // margin to lower the frequency of constructing new buffer
      ]);
      buffer = newBuffer;
    } else {
      buffer.copyWithin(startOffset + data.length, endOffset);
      if(data.length) {
        buffer.set(data, startOffset);
      }
    }
    bufferLength += data.length - toRemove;
    trigger("change", { buffer: getBuffer(), startOffset, endOffset, length: data.length });
  }

  function normalizeInput(text, inputType, offset) {
    if(!text) return undefined;

    switch (inputType) {
      case "text":
        return text.split("").map(charToU8);
      case "hex":
        if (!text.match(/^[0-9a-f]*$/i)) return undefined;
        if (offset % 2 !== 0) {
          const firstByte = u8ToHex(buffer[Math.floor(offset / 2)]);
          text = firstByte[0].concat(text);
        }
        if (text.length % 2 !== 0) {
          const lastByte = u8ToHex(buffer[Math.floor((offset + text.length) / 2)]);
          text = text.concat(insertMode ? "0" : lastByte[1]);
        }
        return text.match(/.{2}/g).map(hexToU8);
      default: throw new Error(`Unknown input type ${inputType}`);
    }
  }

  function normalizeSelectionRange(startOffset, endOffset, charsPerByte = 1) {
    if (startOffset > endOffset) {
      const tmp = startOffset;
      startOffset = endOffset;
      endOffset = tmp;
    }

    return [Math.floor(startOffset / charsPerByte), Math.ceil(endOffset / charsPerByte)];
  }

  function onBeforeInput(e) {
    e.preventDefault();
    const { baseOffset, extentOffset, baseNode: $node, extentNode } = document.getSelection();
    if ($node !== extentNode) return;

    const charsPerByte = $node === $hex.firstChild ? 2 : 1;
    let [startOffset, endOffset] = normalizeSelectionRange(baseOffset, extentOffset, charsPerByte);

    switch (e.inputType) {
      case "insertFromDrop":
      case "insertFromPaste":
      case "insertText": {
        const data = $node === $hex.firstChild ? e.data?.replace(/\s+/gm, "") : e.data;
        const chunk = normalizeInput(data, $node === $hex.firstChild ? "hex" : "text", Math.min(baseOffset, extentOffset));
        if (!chunk) return;

        if (insertMode) {
          insertInBuffer(startOffset, endOffset, chunk);
        } else {
          overwriteInBuffer(startOffset, chunk);
        }
        setCaret($node, Math.min(baseOffset, extentOffset) + data.length);
        return;
      }
      case "deleteByDrag":
      case "deleteByCut":
      case "deleteContent":
      case "deleteContentForward":
      case "deleteContentBackward": {
        const direction = e.inputType.toLowerCase().includes("backward") ? -1 : 1;

        if (startOffset === endOffset) {
          if(direction < 0) {
            startOffset--;
          } else {
            endOffset++;
          }
        }

        let caretOffset = startOffset;
        if (insertMode) {
          insertInBuffer(startOffset, endOffset, []);
        } else {
          const chunk = new Uint8Array(Array(Math.max(endOffset - startOffset, 1)).fill(0));
          overwriteInBuffer(startOffset, chunk);
          caretOffset = direction > 0 ? endOffset : startOffset;
        }
        setCaret($node, caretOffset * charsPerByte);
        return;
      }
      case "historyUndo":
      case "historyRedo":
      default: {
        alert("Unknown input type", e.inputType);
        console.error("Unknown input type", e);
      }
    }
  }

  function onSelectionChange(e) {
    const { baseOffset, extentOffset, baseNode: $node, extentNode } = document.getSelection();
    if ($node !== extentNode) {
      return;
    }

    const charsPerByte = $node === $hex.firstChild ? 2 : 1;
    let [startOffset, endOffset] = normalizeSelectionRange(baseOffset, extentOffset, charsPerByte);

    if ($node === $hex.firstChild) {
      updateSelection(startOffset, endOffset);
    } else if ($node === $text.firstChild) {
      updateSelection(startOffset, endOffset);
    }
  }

  function switchMode(newMode) {
    insertMode = newMode === undefined ? !insertMode : Boolean(newMode);
    $mode.innerText = insertMode ? "INS" : "OVR";
  }

  bindAll($hex, { beforeinput: onBeforeInput });
  bindAll($text, { beforeinput: onBeforeInput });
  bindAll($mode, { click: () => switchMode() });
  switchMode(false);

  // mirror buffer changes in the UI
  handlers.change.push(function({ startOffset, endOffset, length }) {
    if (length < 0) {
      replaceInText($text.firstChild, "", startOffset, startOffset - length);
      replaceInText($hex.firstChild, "", startOffset * 2, (startOffset - length) * 2);
    } else {
      replaceInText($text.firstChild, Array.from(buffer.subarray(startOffset, startOffset + length)).map(u8ToChar).join(""), startOffset, endOffset);
      replaceInText($hex.firstChild, Array.from(buffer.subarray(startOffset, startOffset + length)).map(u8ToHex).join(""), startOffset * 2, endOffset * 2);
    }
  });

  function setBuffer(buf) {
    buffer = buf;
    bufferLength = buffer.length;
    document.removeEventListener("selectionchange", onSelectionChange);

    $size.innerText = `size: ${displayValue(bufferLength)}`;
    const hex = Array.from(buffer).map(u8ToHex);
    const text = Array.from(buffer).map(u8ToChar);
    $hex.innerText = hex.join("");
    $text.innerText = text.join("");
    $index.innerText = new Array(Math.ceil(bufferLength / lineWidth)).fill(0)
      .map((_, i) => (i * lineWidth)
        .toString(16)
        .padStart(6, 0))
      .join("\n");

    document.addEventListener("selectionchange", onSelectionChange);
    trigger("load", { buffer })
    setSelection($text.firstChild, 0);
  }

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
    getBuffer,
    setBuffer,
    getFileName() {
      return fileName ?? "data.bin";
    },
    openFile(buf, name) {
      fileName = name;
      setBuffer(buf);
    }
  };
}

import { $, bindAll, debounce } from "../dom.js";
import { $panel } from "../components/panel.js";

export const $strings = (editor) => {
  let afRid;
  let strArray = [];

  const $body = $.div({ class: "list" });
  const $search = $.input({ type: "search", placeholder: "Search" });
  const $minLength = $.input({ type: "number", min: 3, max: 15, step: 1, value: 6 });
  const $caseSensitive = $.input({ type: "checkbox", title: "Match case", label: "Aa" });

  function getStrings(data) {
    const arr = [];
    let str = "";
    for (let i in data) {
      const chr = data[i];
      if (chr >= 0x20 && chr < 0x7f) {
        str = str.concat(String.fromCharCode(chr));
      } else if (str.length) {
        if (str.length >= 3) {
          arr.push([str, i - str.length]);
        }
        str = "";
      }
    }
    if (str.length) arr.push([str, data.length - str.length]);
    return arr;
  }

  function render(filter = "") {
    $body.innerText = "";
    strArray.forEach(([str, offset]) => {
      const fc = $caseSensitive.checked ? str.includes(filter) : str.toLowerCase().includes(filter.toLowerCase());
      if ((!filter || fc) && str.length >= Number($minLength.value ?? 3)) {
        $body.appendChild($.div({ class: "string", 'data-start': offset, 'data-end': offset + str.length }, [`[0x${offset.toString(16).padStart(5, "0").toUpperCase()}] ${str} `]));
      }
    });
  }

  function onSearchTermChange() {
    cancelAnimationFrame(afRid);
    afRid = requestAnimationFrame(() => render($search.value));
  }

  function onStringClick({ target }) {
    if (target.classList.contains("string")) {
      editor.setSelection(Number(target.dataset.start), Number(target.dataset.end));
    }
  }

  bindAll($body, { click: onStringClick });
  bindAll($search, { change: onSearchTermChange });
  bindAll($minLength, { change: onSearchTermChange });
  bindAll($caseSensitive, { change: onSearchTermChange });

  function parseStrings(buffer) {
    strArray = getStrings(buffer);
    onSearchTermChange();
  }

  const onBufferChange = debounce(() => parseStrings(editor.buffer.getBuffer()), 1000);

  bindAll(editor.buffer, {
    change: onBufferChange,
  });

  const { $element } = $panel({ class: "strings", label: "Strings" }, {
    body: [
      $.div({ class: "filters" }, [$search, $minLength, $caseSensitive]),
      $body
    ],
  });

  return {
    $element,
  };
}

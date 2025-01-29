import { $div, $input, bindAll } from "../dom.js";
import { $panel } from "../components/panel.js";
import { $split } from "../components/split.js";

export const $strings = (editor) => {
  let afRid;
  let strArray = [];

  const $body = $div({ class: "list" });
  const $search = $input({ type: "search", placeholder: "Search" });
  const $minLength = $input({ type: "number", min: 3, max: 15, step: 1, value: 3 });
  const $caseInsensitive = $input({ type: "checkbox", title: "[Aa] Case insensitive" });

  function getStrings(data) {
    const arr = [];
    let str = "";
    for (let i in data) {
      const chr = data[i];
      if (chr >= 0x20 && chr < 0x7f) {
        str = str.concat(String.fromCharCode(chr));
      } else if (str.length) {
        if (str.length >= $minLength.value) {
          arr.push([str, i - str.length]);
        }
        str = "";
      }
    }
    return arr;
  }

  function render(filter = "") {
    $body.innerText = "";
    strArray.forEach(([str, offset]) => {
      const fc = $caseInsensitive.checked ? str.toLowerCase().includes(filter.toLowerCase()) : str.includes(filter)
      if ((!filter || fc) && str.length >= Number($minLength.value ?? 3)) {
        $body.appendChild($div({ class: "string", 'data-start': offset, 'data-end': offset + str.length }, [str]));
      }
    });
  }

  function onSearchTermChange() {
    clearTimeout(afRid);
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
  bindAll($caseInsensitive, { change: onSearchTermChange });

  function parseStrings(buffer) {
    strArray = getStrings(buffer);
    afRid = requestAnimationFrame(() => onSearchTermChange());
  }

  editor.on("load", ({ buffer }) => {
    $search.value = "";
    parseStrings(buffer);
  });
  editor.on("change", ({ buffer }) => parseStrings(buffer));

  const { $element } = $panel({
    header: ["Strings"],
    body: [
      $split({ class: "filters" }, [$search, $minLength, $caseInsensitive]).setHorizontal(),
      $body
    ],
  }, { class: "strings" });

  return {
    $element,
  };
}

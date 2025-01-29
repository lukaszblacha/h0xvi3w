import { $div, $input, $span, bindAll, unbindAll } from "../dom.js";
import { $panel } from "../components/panel.js";

export const $strings = (editor) => {
  let afRid, afRid2;
  let strArray = [];

  const $body = $div();
  const $search = $input({ type: "search" });

  function getStrings(data, minLength = 3) {
    const arr = [];
    let str = "";
    for (let i in data) {
      const chr = data[i];
      if (chr >= 0x20 && chr < 0x7f) {
        str = str.concat(String.fromCharCode(chr));
      } else if (str.length) {
        if (str.length >= minLength) {
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
      if (str.includes(filter)) {
        $body.appendChild($span({ class: "string", 'data-start': offset, 'data-end': offset + str.length }, [str]));
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

  const setData = (data) => { // Takes Uint8Array
    strArray = getStrings(data, 3);
    $search.value = "";
    afRid = requestAnimationFrame(() => onSearchTermChange());
  }

  editor.on("load", setData);

  const { $element } = $panel({
    header: ["Strings"],
    body: [$search, $body],
  }, { class: "strings" });

  return {
    $element,
    setData,
  };
}

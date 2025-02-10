import { $, bindAll, unbindAll, debounce } from "../dom.js";
import { $panel } from "../components/panel.js";
import { bindClassMethods } from "../utils/classes.js";

export class Strings extends EventTarget{
  constructor(editor) {
    super();
    bindClassMethods(this);
    this.onBufferChange = debounce(this.onBufferChange, 500);

    this.strArray = [];
    this.editor = editor;

    this.$body = $.div({ class: "list" });
    this.$search = $.input({ type: "search", placeholder: "Search" });
    this.$minLength = $.input({ type: "number", min: 3, max: 15, step: 1, value: 6 });
    this.$caseSensitive = $.input({ type: "checkbox", title: "Match case", label: "Aa" });

    this.$element = $panel({ class: "strings", label: "Strings" }, {
      body: [
        $.div({ class: "filters" }, [this.$search, this.$minLength, this.$caseSensitive]),
        this.$body
      ],
    }).$element;

    const { $body, $search, $minLength, $caseSensitive, onStringClick, onSearchTermChange, onBufferChange } = this;
    bindAll($body, { click: onStringClick });
    bindAll($search, { change: onSearchTermChange });
    bindAll($minLength, { change: onSearchTermChange });
    bindAll($caseSensitive, { change: onSearchTermChange });
    bindAll(editor.buffer, { change: onBufferChange });
  }

  destroy() {
    const { editor, $body, $search, $minLength, $caseSensitive, onStringClick, onSearchTermChange, onBufferChange } = this;
    unbindAll($body, { click: onStringClick });
    unbindAll($search, { change: onSearchTermChange });
    unbindAll($minLength, { change: onSearchTermChange });
    unbindAll($caseSensitive, { change: onSearchTermChange });
    unbindAll(editor.buffer, { change: onBufferChange });
  }

  render(filter = "") {
    const { $body, $caseSensitive, $minLength, strArray } = this;
    $body.innerText = "";
    strArray.forEach(([str, offset]) => {
      const fc = $caseSensitive.checked ? str.includes(filter) : str.toLowerCase().includes(filter.toLowerCase());
      if ((!filter || fc) && str.length >= Number($minLength.value ?? 3)) {
        $body.appendChild($.div({ class: "string", 'data-start': offset, 'data-end': offset + str.length }, [`[0x${offset.toString(16).padStart(5, "0").toUpperCase()}] ${str} `]));
      }
    });
  }

  onSearchTermChange() {
    cancelAnimationFrame(this.afRid);
    const { render, $search } = this;
    this.afRid = requestAnimationFrame(() => render($search.value));
  }

  onStringClick({ target }) {
    const { editor } = this;
    if (target.classList.contains("string")) {
      editor.setSelection(Number(target.dataset.start), Number(target.dataset.end));
    }
  }

  parseStrings(buffer) {
    this.strArray = [];
    const { onSearchTermChange, strArray } = this;

    let str = "";
    for (let i in buffer) {
      const chr = buffer[i];
      if (chr >= 0x20 && chr < 0x7f) {
        str = str.concat(String.fromCharCode(chr));
      } else if (str.length) {
        if (str.length >= 3) {
          strArray.push([str, i - str.length]);
        }
        str = "";
      }
    }
    if (str.length) strArray.push([str, buffer.length - str.length]);
    onSearchTermChange();
  }

  onBufferChange(){
    const { editor, parseStrings } = this;
    parseStrings(editor.buffer.getBuffer())
  }
}

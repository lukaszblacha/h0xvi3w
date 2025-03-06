import { $, debounce, CustomElement } from "../dom.js";
import { createPanel } from "../components/panel.js";

const attributes = {
  "min-length": { type: "number", defaultValue: 6 },
  "case-sensitive": { type: "bool", defaultValue: "false" },
}

export class Strings extends CustomElement {
  static observedAttributes = Object.keys(attributes);

  constructor(editor) {
    super(attributes);

    this.strArray = [];
    this.editor = editor;

    this.onBufferChange = debounce(this.onBufferChange.bind(this), 200);
    this.onSearchTermChange = this.onSearchTermChange.bind(this);
    this.onStringClick = this.onStringClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);

    createPanel(
      this,
      { label: "Strings", disposable: true }, {
        header:
          $("div", { class: "panel-toolbar" }, [
            $("label", { class: "spacer" }, [
              $("span", {}, ["Search"]),
              $("input", { type: "search", name: "term" }),
            ]),
            $("label", {}, [
              $("span", {}, ["Minimum length"]),
              $("input", { type: "number", name: "min-length", min: 3, max: 15, step: 1, value: 6 }),
            ]),
            $("input", { type: "checkbox", name: "case-sensitive", title: "Match case", label: "Aa" })
          ]),
        body: $("div", { class: "list" })
      }
    )

    this.$body = this.querySelector(".list");
    this.$search = this.querySelector(`input[name="term"]`);
    this.$minLength = this.querySelector(`input[name="min-length"]`);
    this.$caseSensitive = this.querySelector(`input[name="case-sensitive"]`);

    this._events = [
      [this.$body, { click: this.onStringClick }],
      [this.$search, { change: this.onSearchTermChange }],
      [this.$minLength, { change: this.handleInputChange }],
      [this.$caseSensitive, { change: this.handleInputChange }],
      [this.editor.buffer, { change: this.onBufferChange }],
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this.$minLength.value = this.minLength;
    this.$caseSensitive.checked = this.caseSensitive;
    this.onBufferChange();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if ([undefined, null].includes(newValue)) return this.setAttribute(name, this.fields[name].defaultValue);

    switch (name) {
      case "min-length": {
        this.querySelector(`input[name="${name}"]`).value = newValue;
        break;
      }
      case "case-sensitive": {
        this.querySelector(`input[name="${name}"]`).checked = newValue === "true";
        break;
      }
      default: return;
    }
    this.render(this.$search.value);
  }

  handleInputChange(e) {
    const { name, checked, type, value } = e.target;
    this.setAttribute(name, type.toLowerCase() === "checkbox" ? String(checked) : value);
  }

  render(filter = "") {
    const fc = this.caseSensitive
      ? (str) => str.includes(filter)
      : (str) => str.toLowerCase().includes(filter.toLowerCase());

    this.$body.innerText = "";
    this.strArray.forEach(([str, offset]) => {
      if (str.length >= this.minLength && (!filter || fc(str))) {
        this.$body.appendChild($(
          "div",
          { class: "string", "data-start": offset, "data-end": offset + str.length },
          [
            $("span", {}, `${offset.toString(16).padStart(5, "0").toUpperCase()}h: `),
            str
          ]
        ));
      }
    });
  }

  onSearchTermChange() {
    cancelAnimationFrame(this.afRid);
    this.afRid = requestAnimationFrame(() => this.render(this.$search.value));
  }

  onStringClick({ target }) {
    if (target.classList.contains("string")) {
      this.editor.setSelection(Number(target.dataset.start), Number(target.dataset.end));
    }
  }

  parseStrings(buffer) {
    this.strArray = [];

    let str = "";
    for (let i in buffer) {
      const chr = buffer[i];
      if (chr >= 0x20 && chr < 0x7f) {
        str = str.concat(String.fromCharCode(chr));
      } else if (str.length) {
        if (str.length >= 3) {
          this.strArray.push([str, i - str.length]);
        }
        str = "";
      }
    }
    if (str.length) this.strArray.push([str, buffer.length - str.length]);
    this.onSearchTermChange();
  }

  onBufferChange(){
    this.parseStrings(this.editor.buffer.getBuffer())
  }
}
customElements.define("hv-strings", Strings);

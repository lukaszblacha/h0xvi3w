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

    this.editor = editor;
    this.worker = new Worker("modules/strings-worker.js");

    this.onBufferChange = this.onBufferChange.bind(this);
    this.onSearchTermChange = this.onSearchTermChange.bind(this);
    this.onStringClick = this.onStringClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.render = debounce(this.render.bind(this), 100);

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
              $("span", {}, ["Min length"]),
              $("input", { type: "number", name: "min-length", min: 3, max: 15, step: 1, value: 6 }),
            ]),
            $("input", { type: "checkbox", name: "case-sensitive", title: "Match case", label: "Aa" })
          ]),
        body: $("div", { class: "list notranslate" })
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
      [this.worker, { message: this.onMessage }]
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
    this.render();
  }

  handleInputChange(e) {
    const { name, checked, type, value } = e.target;
    this.setAttribute(name, type.toLowerCase() === "checkbox" ? String(checked) : value);
  }

  onMessage({ data }) {
    const { offsets, ends } = data;

    this.$body.innerText = "";

    const query = this.caseSensitive ? this.$search.value : this.$search.value.toLowerCase();

    let fc = this.caseSensitive
      ? (str) => str.includes(query)
      : (str) => str.toLowerCase().includes(query);
    if (!query) fc = () => true;

    offsets.forEach((offset, index) => {
      const endOffset = ends[index];
      const str = this.editor.buffer.readString(offset, endOffset);
      if (fc(str)) {
        this.$body.appendChild($(
          "div",
          { class: "string", "data-start": offset, "data-end": endOffset },
          [
            $("span", {}, `${offset.toString(16).padStart(5, "0").toUpperCase()}h: `),
            str
          ]
        ));
      }
    });

    this.busy = false;
    if (this.queue) {
      this.render();
    }
  }

  render() {
    if (this.busy) {
      this.queue = true;
      return;
    }

    const { editor, minLength } = this;

    this.queue = false;
    this.busy = true;
    const b = editor.buffer;
    this.worker.postMessage({
      action:"search",
      buffer: b.buffer.slice(b.startOffset, b.endOffset),
      minLength,
    });
  }

  onSearchTermChange() {
    this.render();
  }

  onStringClick({ target }) {
    if (target.classList.contains("string")) {
      this.editor.setSelection(Number(target.dataset.start), Number(target.dataset.end));
    }
  }

  onBufferChange(){
    this.render();
  }
}
customElements.define("hv-strings", Strings);

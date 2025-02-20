import { $, bindAll, unbindAll, debounce } from "../dom.js";
import { Panel } from "../components/panel.js";

export class Strings extends Panel {
  static observedAttributes = ["min-length", "case-sensitive"];

  constructor(editor) {
    super({ label: "Strings" }, {
      header: [
        $("input", { type: "search", name: "term", placeholder: "Search" }),
        $("input", { type: "number", name: "min-length", min: 3, max: 15, step: 1, value: 6 }),
        $("input", { type: "checkbox", name: "case-sensitive", title: "Match case", label: "Aa" })
      ],
      body: $("div", { class: "list" })
    });

    this.onBufferChange = debounce(this.onBufferChange.bind(this), 200);
    this.onSearchTermChange = this.onSearchTermChange.bind(this);
    this.onStringClick = this.onStringClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);

    this.strArray = [];
    this.editor = editor;
  }

  connectedCallback() {
    super.connectedCallback();

    this.$body = this.querySelector(".list");
    this.$search = this.querySelector("input[type=search]");

    const [, minLengthInput, caseSensitiveInput] = this.querySelectorAll("input");
    minLengthInput.value = this.getAttribute("min-length");
    caseSensitiveInput.checked = this.getAttribute("case-sensitive") === "true";

    bindAll(this.$body, { click: this.onStringClick });
    bindAll(this.$search, { change: this.onSearchTermChange });
    bindAll(minLengthInput, { change: this.handleInputChange });
    bindAll(caseSensitiveInput, { change: this.handleInputChange });
    bindAll(this.editor.buffer, { change: this.onBufferChange });

    this.onBufferChange();
  }

  disconnectedCallback() {
    const [, minLengthInput, caseSensitiveInput] = this.querySelectorAll("input");
    unbindAll(this.$body, { click: this.onStringClick });
    unbindAll(this.$search, { change: this.onSearchTermChange });
    unbindAll(minLengthInput, { change: this.handleInputChange });
    unbindAll(caseSensitiveInput, { change: this.handleInputChange });
    unbindAll(this.editor.buffer, { change: this.onBufferChange });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected) return;
    const [, minLengthInput, caseSensitiveInput] = this.querySelectorAll("input");
    switch (name) {
      case "min-length": {
        minLengthInput.value = newValue;
        break;
      }
      case "case-sensitive": {
        caseSensitiveInput.checked = newValue ;
        break;
      }
      default: return;
    }
    this.render(this.$search.value);
  }

  handleInputChange(e) {
    const { name, checked, type, value } = e.target;
    this.setAttribute(name, type.toLowerCase() === "checkbox" ? checked : value);
  }

  render(filter = "") {
    this.$body.innerText = "";
    this.strArray.forEach(([str, offset]) => {
      const fc = this.getAttribute("case-sensitive") === "true" ? str.includes(filter) : str.toLowerCase().includes(filter.toLowerCase());
      if ((!filter || fc) && str.length >= Number(this.getAttribute("min-length") ?? 3)) {
        this.$body.appendChild($("div", { class: "string", 'data-start': offset, 'data-end': offset + str.length }, [`[0x${offset.toString(16).padStart(5, "0").toUpperCase()}] ${str} `]));
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

import { $, debounce, smoothen, CustomElement, toCamelCase } from "../dom.js";
import { createPanel } from "../components/panel.js";
import { Scrollbar } from "../components/scrollbar.js";

export class Strings extends CustomElement {
  static customAttributes = {
    "min-length": { type: "number", defaultValue: 6 },
    "case-sensitive": { type: "bool", defaultValue: "false" },
  };
  static observedAttributes = Object.keys(Strings.customAttributes);

  constructor(editor) {
    super();

    this.editor = editor;
    this.worker = new Worker("modules/strings-worker.js");

    this.onBufferChange = this.onBufferChange.bind(this);
    this.onSearchTermChange = this.onSearchTermChange.bind(this);
    this.onStringClick = this.onStringClick.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.render = debounce(this.render.bind(this), 100);
    this.onResize = smoothen(this.onResize.bind(this), 100);

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
              $("input", { type: "number", name: "min-length", min: 3, max: 500, step: 1, value: 6 }),
            ]),
            $("input", { type: "checkbox", name: "case-sensitive", title: "Match case", label: "Aa" })
          ]),
        body: $("div", { class: "list notranslate" })
      }
    )

    this.$scrollbar = new Scrollbar();
    this.$body = this.querySelector(".panel-body");
    this.$list = this.querySelector(".list");
    this.$search = this.querySelector(`input[name="term"]`);
    this.$minLength = this.querySelector(`input[name="min-length"]`);
    this.$caseSensitive = this.querySelector(`input[name="case-sensitive"]`);
    this.$list.parentNode.appendChild(this.$scrollbar);

    this._events = [
      [this.$list, { click: this.onStringClick }],
      [this.$search, { change: this.onSearchTermChange }],
      [this.$minLength, { change: this.handleInputChange }],
      [this.$caseSensitive, { change: this.handleInputChange }],
      [this.editor.buffer, { change: this.onBufferChange }],
      [this.worker, { message: this.onMessage }],
      [this.$scrollbar, { vscroll: ({ detail }) => this.$body.scrollTop = detail.position }],
      [this.$body, { scroll: () => this.$scrollbar.position = this.$body.scrollTop }],
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this.$minLength.value = this.minLength;
    this.$caseSensitive.checked = this.caseSensitive;
    this.$scrollbar.position = 0;

    this.resizeObserver = new ResizeObserver(this.onResize);
    this.resizeObserver.observe(this);

    this.onBufferChange();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObserver.unobserve(this);
    this.resizeObserver = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if ([undefined, null, "null", "undefined"].includes(newValue)) return this.setAttribute(name, this.fields[name].defaultValue);

    switch (name) {
      case "min-length": {
        this.$minLength.setAttribute("value", newValue);
        break;
      }
      case "case-sensitive": {
        if (!["", "false"].includes(newValue)) {
          this.$caseSensitive.setAttribute("checked", newValue);
        } else {
          this.$caseSensitive.removeAttribute("checked");
        }
        break;
      }
      default: return;
    }
    this.render();
  }

  handleInputChange(e) {
    const { name: inputName, type } = e.target;
    const name = toCamelCase(inputName);
    if (name in this) {
      switch (type) {
        case "checkbox":
          return this[name] = e.target.checked;
        case "number":
          return this[name] = e.target.valueAsNumber;
        default:
          this[name] = e.target.value;
      }
    }
  }

  onMessage({ data }) {
    const { offsets, ends } = data;
    const { $list, $scrollbar, $search, $body, caseSensitive } = this;

    $list.innerText = "";

    const query = caseSensitive ? $search.value : $search.value.toLowerCase();

    let fc = caseSensitive
      ? (str) => str.includes(query)
      : (str) => str.toLowerCase().includes(query);
    if (!query) fc = () => true;

    offsets.forEach((offset, index) => {
      const endOffset = ends[index];
      const str = this.editor.buffer.readString(offset, endOffset);
      if (fc(str)) {
        $list.appendChild($(
          "div",
          { class: "string", "data-start": offset, "data-end": endOffset },
          [
            $("span", {}, `${offset.toString(16).padStart(5, "0").toUpperCase()}h: `),
            str
          ]
        ));
      }
    });

    setTimeout(() => {
      $scrollbar.containerSize = $body.clientHeight;
      $scrollbar.containerScrollSize = $body.scrollHeight;
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

  onStringClick({ target }) {
    if (target.classList.contains("string")) {
      this.editor.setSelection(Number(target.dataset.start), Number(target.dataset.end));
    }
  }

  onSearchTermChange() { this.render(); }
  onResize() { this.render(); }
  onBufferChange(){ this.render(); }
}
customElements.define("hv-strings", Strings);

import { $, CustomElement } from "../dom.js";
import { createPanel } from "../components/panel.js";
import { packer } from "../utils/packer.js";
import { DataBuffer } from "../structures/buffer.js";
import { StructTemplate } from "./struct-template.js";
import { HVStorage } from "../utils/storage.js";

export class Struct extends CustomElement {
  constructor(editor) {
    super({});

    this.editor = editor;
    this.storage = new HVStorage("hexview/structs", {});

    this.onFieldClick = this.onFieldClick.bind(this);
    this.onTemplatesChage = this.onTemplatesChage.bind(this);
    this.openTemplateDialog = this.openTemplateDialog.bind(this);
    this.parse = this.parse.bind(this);

    createPanel(
      this,
      { label: "Structures", disposable: true }, {
      body: [
        $("div", { class: "panel-toolbar" }, [
          $("label", {}, [
            $("span", {}, ["Offset"]),
            $("input", { type: "number", name: "offset", min: 0, value: 0 }),
          ]),
          $("label", {}, [
            $("span", {}, ["Template"]),
            $("select", { name: "template" }),
          ]),
          $("button", { name: "edit", title: "Edit" }, "✎"),
          $("div", { class: "spacer" }),
          $("button", { name: "parse", title: "Parse" }, "▶"),
        ]),
        $("div", { class: "dialog" }),
        $("table", { class: "result" }),
      ],
    });

    this._events = [
      [this.querySelector(`button[name="edit"]`), { click: this.openTemplateDialog }],
      [this.querySelector(`button[name="parse"]`), { click: this.parse }],
      [this.querySelector(".panel-body"), { click: this.onFieldClick }],
      [this.storage, { change: this.onTemplatesChage }],
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this.renderOptions(Object.keys(this.storage.load()));
  }

  get offset() {
    return parseInt(this.querySelector(`input[name="offset"]`).value);
  }

  get templateName() {
    return this.querySelector("select").value;
  }

  onFieldClick({ target }) {
    const field = target.closest(".field");
    if (field) {
      this.editor.setSelection(Number(field.dataset.start), Number(field.dataset.end));
    }
  }

  openTemplateDialog() {
    const $node = this.querySelector(".dialog");
    $node.innerText = "";
    $node.appendChild(new StructTemplate(this.storage, this.templateName));
  }

  renderOptions(options) {
    const select = this.querySelector("select");
    select.innerText = "";
    select.appendChild($("option", { value: "" }, ["New structure..."]));
    options.forEach((name) => {
      select.appendChild($("option", { value: name }, [name]));
    });
  }

  onTemplatesChage({ detail }) {
    this.renderOptions(Object.keys(detail.data));
  }

  parse() {
    const { offset } = this;
    const { format, spec } = this.storage.load()[this.templateName];
    const p = packer(format, spec);
    this.render(p.from(new DataBuffer(this.editor.buffer, offset)).toJSON(), p.tokens);

    const highlights = p.tokens.map((token, index) => {
      return { name: index % 2 ? "red" : "green", start: offset + token.offset, end: offset + token.offset + token.length * token.size };
    });
    this.editor.setHighlights(highlights);
  }

  render(data, tokens) {
    const $node = this.querySelector(".result");
    $node.innerText = "";
    Object.entries(data).forEach(([key, value], index) => {
      const { offset, size, length } = tokens[index];
      $node.appendChild($(
        "tr",
        {
          class: "field",
          "data-start": this.offset + offset,
          "data-end": this.offset + offset + size * length
        },
        [
          $("td", {}, key),
          $("td", { class: "right" }, String(value)),
        ])
      );
    });
  }
}
customElements.define("hv-struct", Struct);

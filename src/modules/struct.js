import { $, bindAll, unbindAll } from "../dom.js";
import { Panel } from "../components/panel.js";
import { packer } from "../utils/packer.js";
import { DataBuffer } from "../structures/buffer.js";
import { StructTemplate } from "./struct-template.js";
import { HVStorage } from "../utils/storage.js";

export class Struct extends Panel {
  constructor(editor) {
    super({ label: "Structures" }, {
      body: [
        $("div", { class: "panel-toolbar" }, [
          "offset: ",
          $("input", { type: "number", name: "offset", min: 0, value: 0 }),
          "template: ",
          $("select", { name: "template" }),
          $("button", { name: "edit", title: "Edit" }, "✎"),
          $("button", { name: "parse", title: "Parse" }, "▶"),
        ]),
        $("div", { class: "dialog" }),
        $("table", { class: "result" }),
      ],
    });

    this.onInputChange = this.onInputChange.bind(this);
    this.onFieldClick = this.onFieldClick.bind(this);
    this.onTemplatesChage = this.onTemplatesChage.bind(this);
    this.openTemplateDialog = this.openTemplateDialog.bind(this);
    this.parse = this.parse.bind(this);

    this.editor = editor;
    this.storage = new HVStorage("hexview/structs", {});
  }

  connectedCallback() {
    super.connectedCallback();

    Array.from(this.querySelectorAll("input"))
      .forEach(e => bindAll(e, { change: this.onInputChange }));
    bindAll(this.querySelector(`button[name="edit"]`), { click: this.openTemplateDialog });
    bindAll(this.querySelector(`button[name="parse"]`), { click: this.parse });
    bindAll(this.querySelector(".panel-body"), { click: this.onFieldClick });
    bindAll(this.storage, { change: this.onTemplatesChage });

    this.renderOptions(Object.keys(this.storage.load()));
  }

  disconnectedCallback() {
    Array.from(this.querySelectorAll("input"))
      .forEach(e => unbindAll(e, { change: this.onInputChange }));
    unbindAll(this.querySelector(`button[name="edit"]`), { click: this.openTemplateDialog });
    unbindAll(this.querySelector(`button[name="parse"]`), { click: this.parse });
    unbindAll(this.querySelector(".panel-body"), { click: this.onFieldClick });
    unbindAll(this.storage, { change: this.onTemplatesChage });
  }

  get offset() {
    return parseInt(this.querySelector(`input[name="offset"]`).value);
  }

  get templateName() {
    return this.querySelector("select").value;
  }

  onInputChange() {
    // const p = packer(this.format);
    // console.log(p);
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
          $("td", {}, String(value)),
        ])
      );
    });
  }
}
customElements.define("hv-struct", Struct);

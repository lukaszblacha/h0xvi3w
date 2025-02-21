import { $, bindAll, unbindAll } from "../dom.js";
import { packer } from "../utils/packer.js";
import { Panel } from "../components/panel.js";

export class StructTemplate extends Panel {
  constructor(storage, name = "struct") {
    super({ class: "dialog" }, {
      header: "Edit structure",
      body: $("div", {}, [
        $("div", { class: "panel-toolbar" }, [
          "name: ",
          $("input", { class: "name", name: "name", value: name }),
          "format: ",
          $("input", { class: "format", name: "format", value: ">" }),
        ]),
        $("table", { class: "spec" }),
        $("div", { class: "panel-toolbar" }, [
          $("button", { name: "save", title: "Save" }, "💾"),
          $("button", { name: "remove", title: "Remove" }, "🗑"),
          $("button", { name: "cancel", title: "Cancel" }, "✕")
        ])
      ])
    });

    this.onFormatChange = this.onFormatChange.bind(this);
    this.onFieldChange = this.onFieldChange.bind(this);
    this.save = this.save.bind(this);
    this.remove = this.remove.bind(this);
    this.close = this.close.bind(this);

    this.storage = storage;
    this.load(name);
  }

  connectedCallback() {
    super.connectedCallback();
    bindAll(this.querySelector(`input[name="format"]`), { change: this.onFormatChange });
    Array.from(this.querySelectorAll("table.spec input"))
      .forEach(e => bindAll(e, { change: this.onFieldChange }));
    bindAll(this.querySelector(`button[name="save"]`), { click: this.save });
    bindAll(this.querySelector(`button[name="remove"]`), { click: this.remove });
    bindAll(this.querySelector(`button[name="cancel"]`), { click: this.close });
  }

  disconnectedCallback() {
    unbindAll(this.querySelector(`input[name="format"]`), { change: this.onFormatChange });
    Array.from(this.querySelectorAll("table.spec input"))
      .forEach(e => unbindAll(e, { change: this.onFieldChange }));
    unbindAll(this.querySelector(`button[name="save"]`), { click: this.save });
    unbindAll(this.querySelector(`button[name="remove"]`), { click: this.remove });
    unbindAll(this.querySelector(`button[name="cancel"]`), { click: this.close });
  }

  get name() {
    return this.querySelector(`input[name="name"]`).value;
  }

  set name(name) {
    this.querySelector(`input[name="name"]`).value = name;
  }

  get format() {
    return this.querySelector(`input[name="format"]`).value;
  }

  set format(format) {
    this.querySelector(`input[name="format"]`).value = format;
  }

  get spec() {
    try {
      const { tokens } = packer(this.format);
      let spec = [];
      [...this.querySelectorAll(`table.spec input`)].forEach((i, index) => spec.push(i.value || `prop${index}`));
      if (spec.length < tokens.length) {
        spec = spec.concat(new Array(tokens.length - spec.length).fill(0).map((_, i) => `prop${i + spec.length}`));
      }
      return spec;
    } catch {
      //
    }
    return [];
  }

  set spec(spec) {
    this.render(spec);
  }

  onFormatChange() {
    try {
      packer(this.format);
    } catch(err) {
      alert(err.message);
      return;
    }
    this.render();
  }

  onFieldChange() {
    try {
      packer(this.format, this.spec);
    } catch(err) {
      alert(err.message);
    }
  }

  close() {
    this.parentNode.removeChild(this);
  }

  remove() {
    const { format, spec } = this;
    packer(format, spec); // validation
    const structs = this.storage.load();
    delete structs[this.name];
    this.storage.save(structs);
    this.close();
  }

  save() {
    const { format, spec } = this;
    packer(format, spec); // validation
    const structs = this.storage.load();
    this.storage.save({
      ...structs,
      [this.name]: { format, spec }
    });
    this.close();
  }

  load(name) {
    const structs = this.storage.load();
    this.format = structs[name]?.format ?? ">";
    this.spec = structs[name]?.spec ?? [];
  }

  render(spec = this.spec) {
    const { format } = this;
    try {
      const { tokens } = packer(format, spec);
      const $node = this.querySelector("table.spec");
      $node.innerText = "";
      $node.appendChild($("thead", {}, [
        $("tr", {}, [
          $("th", {}, ["Property name"]),
          $("th", {}, ["Type"]),
          $("th", {}, ["Offset"]),
          $("th", {}, ["Quantity"]),
          $("th", {}, ["Size"]),
        ])
      ]));
      tokens.forEach((token, index) => {
        $node.appendChild($("tr", {}, [
          $("td", {}, $("input", { value: spec[index] })),
          $("td", {}, token.char),
          $("td", {}, String(token.offset)),
          $("td", {}, String(token.length)),
          $("td", {}, [`${token.size * token.length}B`]),
        ]));
      });
    } catch {
      // noop
    }
  }
}

customElements.define("hv-struct-template", StructTemplate);

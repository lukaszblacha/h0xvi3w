import { $, CustomElement } from "../dom.js";
import { packer } from "../utils/packer.js";
import { createPanel } from "../components/panel.js";

export class StructTemplate extends CustomElement {
  constructor(storage, name = "struct") {
    super({});

    this.storage = storage;

    this.onFormatChange = this.onFormatChange.bind(this);
    this.onFieldChange = this.onFieldChange.bind(this);
    this.save = this.save.bind(this);
    this.removeTemplate = this.removeTemplate.bind(this);
    this.close = this.close.bind(this);

    createPanel(
      this,
      {},
      {
        header: ["Edit structure"],
        body: [
          $("div", { class: "info" }, [
            "Simplified implementation of python's struct. ",
            $("a", { href: "https://docs.python.org/3/library/struct.html#format-characters", rel: "noopener, noreferrer", target: "_blank" }, ["learn more"]),
          ]),
          $("div", { class: "panel-toolbar" }, [
            $("label", {}, [
              $("span", {}, ["Name"]),
              $("input", { class: "name", name: "name", value: name }),
            ]),
            $("label", {}, [
              $("span", {}, ["Format"]),
              $("input", { class: "format", name: "format", value: ">" }),
            ]),
          ]),
          $("div", { class: "spec" }),
        ],
        footer: $("div", { class: "panel-toolbar" }, [
          $("button", { name: "remove", title: "Remove" }, "Remove"),
          $("div", { class: "spacer" }),
          $("button", { name: "cancel", title: "Cancel" }, "Cancel"),
          $("button", { name: "save", title: "Save" }, "Save"),
        ])
      }
    );

    this._events = [
      [this.querySelector(".spec"), { change: this.onFieldChange }],
      [this.querySelector(`input[name="format"]`), { change: this.onFormatChange }],
      [this.querySelector(`button[name="save"]`), { click: this.save }],
      [this.querySelector(`button[name="remove"]`), { click: this.removeTemplate }],
      [this.querySelector(`button[name="cancel"]`), { click: this.close }],
    ];

    this.load(name);
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
      [...this.querySelectorAll(`.spec input`)].forEach((i, index) => spec.push(i.value || `prop${index}`));
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
    this.remove();
  }

  removeTemplate() {
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
      const { tokens } = packer(format);
      const $table = $("table");
      $table.appendChild($("thead", {}, [
        $("tr", {}, [
          $("th", { class: "left" }, "Property name"),
          $("th", { class: "right" }, "Type"),
          $("th", { class: "right" }, "Offset"),
          $("th", { class: "right" }, "Quantity"),
          $("th", { class: "right" }, "Size"),
        ])
      ]));
      tokens.forEach((token, index) => {
        $table.appendChild($("tr", {}, [
          $("td", {}, $("input", { value: spec[index] })),
          $("td", { class: "right" }, token.char),
          $("td", { class: "right" }, String(token.offset)),
          $("td", { class: "right" }, String(token.length)),
          $("td", { class: "right" }, [`${token.size * token.length}B`]),
        ]));
      });
      const $node = this.querySelector(".spec");
      $node.innerText = "";
      $node.appendChild($table);
    } catch {
      // noop
    }
  }
}

customElements.define("hv-struct-template", StructTemplate);

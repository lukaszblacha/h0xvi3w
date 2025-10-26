import { isDivider, Split } from "../components/split.js";
import { Tabs } from "../components/tabs.js";
import { Strings } from "../modules/strings.js";
import { ValuesExplorer } from "../modules/values-explorer.js";
import { Canvas } from "../modules/canvas.js";
import { Struct } from "../modules/struct.js";
import { HexEditor } from "../modules/editor.js";
import { defaultLayout } from "./config.js";
import { $, toCamelCase } from "../dom.js";

const componentMap = {
  "hv-tabs": Tabs,
  "hv-split": Split,
  "hv-editor": HexEditor,
  "hv-values-explorer": ValuesExplorer,
  "hv-strings": Strings,
  "hv-canvas": Canvas,
  "hv-struct": Struct
};


function restoreProperties(el, cfg = {}) {
  Object.entries(el.constructor.customAttributes || {}).forEach(([attributeName, { defaultValue }]) => {
    const key = toCamelCase(attributeName);
    el[key] = cfg[key] ?? defaultValue;
  });
}

function saveProperties(el) {
  return Object.entries(el.constructor.customAttributes || {}).reduce((acc, [attributeName, { defaultValue }]) => {
    const key = toCamelCase(attributeName);
    return { ...acc, [key]: el[key] ?? defaultValue };
  }, {});
}

export class Layout extends HTMLElement {
  constructor(editor) {
    super();
    this.initialized = false;
    this.editor = editor;
    this.classList.add("layout");
    this.appendChild($("div"));

    this.getLayoutElement = this.getLayoutElement.bind(this);
  }

  connectedCallback() {
    if (!this.initialized) {
      this.initialized = true;
      this.set(defaultLayout);
    }
  }

  createLayoutElement(cfg, parent) {
    let component;
    switch (cfg.type) {
      case "hv-split": {
        component = new Split();
        restoreProperties(component, cfg.properties);
        cfg.items?.map((item) => this.createLayoutElement(item)).forEach(el => component.appendChild(el));
        break;
      }
      case "hv-tabs": {
        component = new Tabs(cfg.items?.map((item) => this.createLayoutElement(item)));
        restoreProperties(component, cfg.properties);
        break;
      }
      case "hv-editor": {
        component = this.editor;
        restoreProperties(component, cfg.properties);
        break;
      }
      case "hv-strings": {
        component = new Strings(this.editor);
        restoreProperties(component, cfg.properties);
        break;
      }
      case "hv-values-explorer": {
        component = new ValuesExplorer(this.editor);
        restoreProperties(component, cfg.properties);
        break;
      }
      case "hv-canvas": {
        component = new Canvas(this.editor);
        restoreProperties(component, cfg.properties);
        break;
      }
      case "hv-struct": {
        component = new Struct(this.editor);
        restoreProperties(component, cfg.properties);
        break;
      }
      default: {
        throw new Error(`Unknown component type "${cfg.type}"`);
      }
    }

    parent?.appendChild(component);

    return component;
  }

  getLayoutElement(el) {
    const tagName = el.tagName.toLowerCase();
    if (tagName in componentMap) {
      const component = {
        type: tagName,
        properties: saveProperties(el),
      };
      if (tagName === "hv-split") {
        Object.assign(component, {
          items: [...el.children].map(this.getLayoutElement).filter(Boolean),
        });
      } else if (tagName === "hv-tabs") {
        Object.assign(component, {
          items: [...el.querySelector(".tabs-container").children].map(this.getLayoutElement).filter(Boolean),
        });
      }
      return component;
    }    // meh - could be more than just one child, which one?
    return [...el.children].map(this.getLayoutElement)[0];
  }

  set(layout = defaultLayout) {
    this.firstChild.replaceWith(this.createLayoutElement(layout));

    // lock split children size as percentage
    setTimeout(() => {
      this.querySelectorAll("hv-split").forEach(($split) => {
        const splitSize = $split.getSize();
        [...$split.children]
          .filter((el) => !isDivider(el))
          .map((el) => {
            const rect = el.getBoundingClientRect();
            return [el, $split.orientation === "horizontal" ? rect.width : rect.height];
          })
          .forEach(([c, size]) => {
            c.style.setProperty("flex", `1 1 ${size / splitSize * 100}%`);
          });
      });
    });
  }

  get() {
    return this.getLayoutElement(this.firstChild);
  }

  save() {
    localStorage.setItem("hexview/layout", JSON.stringify(this.get()));
  }

  restore() {
    try {
      this.set(JSON.parse(localStorage.getItem("hexview/layout")));
    } catch {
      this.set();
    }
  }

  toggleWindow(name) {
    if (!(name in componentMap)) return;
    const $node = document.querySelector(name);
    if ($node) {
      $node.remove();
    } else {
      document.querySelector(".tabs-container").appendChild(new componentMap[name](this.editor));
    }
  }
}
customElements.define("hv-layout", Layout);

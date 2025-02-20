import { Split } from "./components/split.js";
import { Tabs } from "./components/tabs.js";
import { Strings } from "./modules/strings.js";
import { ValuesExplorer } from "./modules/values-explorer.js";
import { Canvas } from "./modules/canvas.js";
import { HexEditor } from "./modules/editor.js";
import { $ } from "./dom.js";

const defaultLayout = { type: "hv-split", orientation: "vertical", items: [{ type: "hv-tabs", items: [{ type: "hv-editor" }] }] };

const componentMap = {
  "hv-tabs": Tabs,
  "hv-split": Split,
  "hv-editor": HexEditor,
  "hv-values-explorer": ValuesExplorer,
  "hv-strings": Strings,
  "hv-canvas": Canvas
};

const windows = {
  "strings": { create: (e) => new Strings(e) },
  "canvas": { create: (e) => new Canvas(e) },
  "values-explorer": { create: (e) => new ValuesExplorer(e) },
};

export class Layout extends HTMLElement {
  constructor(editor) {
    super();

    this.getLayoutElement = this.getLayoutElement.bind(this);

    this.editor = editor;
    this.windows = [];
  }

  connectedCallback() {
    this.classList.add("layout");
    this.appendChild($("div"));
    this.set(defaultLayout);
  }

  createLayoutElement(cfg, parent) {
    let component;
    switch (cfg.type) {
      case "hv-split": {
        component = new Split();
        component.setAttribute("orientation", cfg.orientation ?? "horizontal");
        cfg.items?.map((item) => this.createLayoutElement(item)).forEach(el => component.appendChild(el));
        break;
      }
      case "hv-tabs": {
        component = new Tabs(cfg.items?.map((item) => this.createLayoutElement(item)));
        component.setAttribute("tabs-position", cfg["tabs-position"] ?? "top");
        break;
      }
      case "hv-editor": {
        component = this.editor;
        cfg.views && component.setAttribute("views", cfg.views);
        cfg.mode && component.setAttribute("mode", cfg.mode);
        break;
      }
      case "hv-strings": {
        component = new Strings(this.editor);
        this.windows.push(component);
        break;
      }
      case "hv-values-explorer": {
        component = new ValuesExplorer(this.editor);
        this.windows.push(component);
        break;
      }
      case "hv-canvas": {
        component = new Canvas(this.editor);
        component.setAttribute("width", cfg.width ?? 50);
        component.setAttribute("offset", cfg.offset ?? 0);
        this.windows.push(component);
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
      const component = (componentMap[tagName].observedAttributes || []).reduce(
        (acc, key) => ({ ...acc, [key]: el.getAttribute(key) }),
        { type: tagName }
      );
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

  set(layout) {
    // is this still necessary?
    this.windows.forEach(w => w.parentNode.removeChild(w));
    this.windows = [];
    const root = this.createLayoutElement(layout);

    this.firstChild.replaceWith(root);
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
    if (!windows[name]) return;
    const cfg = windows[name];
    if (cfg.window) {
      cfg.window.parentNode.removeChild(cfg.window);
      delete cfg.window;
    } else {
      cfg.window = cfg.create(this.editor);
      document.querySelector(".tabs-container").appendChild(cfg.window);
    }
  }
}
customElements.define("hv-layout", Layout);

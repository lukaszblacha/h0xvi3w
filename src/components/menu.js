import { $, bindAll, unbindAll } from "../dom.js";

const toMenuItems = (items) => {
  if (!Array.isArray(items)) return [];

  return items.map((item) => {
    const items = toMenuItems(item.items);
    const content = items.length > 0 && $("ul", { class: "submenu" }, items);
    const $el = item.type === "spacer"
      ? $("hr")
      : $("li", { class: "item", tabIndex: 0 }, [item.label, item.$element, content]);

    if (item.action instanceof Function) {
      // fixme: remove the listener when destroying the dom node
      $el.addEventListener('click', item.action);
    }

    return $el;
  });
}

export class MainMenu extends HTMLElement {
  constructor() {
    super();
    this.onClick = this.onClick.bind(this);
  }

  connectedCallback() {
    bindAll(this, { click: this.onClick });
  }

  disconnectedCallback() {
    unbindAll(this, { click: this.onClick });
  }

  onClick(e) {
    if (e.target.parentNode.classList.contains("submenu")) {
      document.activeElement.blur();
    }
  }

  setItems(obj) {
    toMenuItems(obj.items).forEach((item) => this.appendChild(item));
  }
}
customElements.define("hv-menu", MainMenu);

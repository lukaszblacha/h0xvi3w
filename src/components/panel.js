import { $ } from "../dom.js";

export class Panel extends HTMLElement {
  constructor(attributes = {}, { header, body, footer } = {}) {
    super();
    this.initialized = false;
    Object.entries(attributes).forEach(([name, value]) => this.setAttribute(name, value));
    if (header) this.appendChild($("div", { class: "panel-header" }, header));
    if (body) this.appendChild($("div", { class: "panel-body" }, body));
    if (footer) this.appendChild($("div", { class: "panel-footer" }, footer));
  }

  connectedCallback() {
    if (!this.initialized) {
      this.initialized = true;
      this.classList.add("panel");
    }
  }
}
customElements.define("hv-panel", Panel);

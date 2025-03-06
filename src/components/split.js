import { CustomElement } from "../dom.js";

const fields = {
  orientation: { type: "string", defaultValue: "horizontal" },
};

export class Split extends CustomElement {
  static observedAttributes = ["orientation"];

  constructor() {
    super(fields);
    this.classList.add("split");
  }

  connectedCallback() {
    super.connectedCallback();
    this.observer = new MutationObserver(this.onChildNodesChange.bind(this));
    this.observer.observe(this, { childList: true });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
    this.observer = null;
  }

  onChildNodesChange() {
    switch (this.children.length) {
      case 0:
        this.remove();
        return;
      case 1: {
        const $child = this.children[0];
        this.parentNode.insertBefore($child, this);
        this.remove();
        return;
      }
    }
    Array.from(this.children).forEach((item) => {
      if(item.tagName.toLowerCase() === "hv-split" && item.orientation === this.orientation) {
        Array.from(item.children).forEach((child) => {
          try {
            item.insertAdjacentElement("beforebegin", child);
          } catch { /* "item" automatically gets replaced by its last child */ }
        });
      }
    })
  }
}
customElements.define("hv-split", Split);

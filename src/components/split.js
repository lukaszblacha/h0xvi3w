export class Split extends HTMLElement {
  static observedAttributes = ["orientation"];

  constructor() {
    super();
    this.initialized = false;

    this.onChildNodesChange = this.onChildNodesChange.bind(this);
  }

  connectedCallback() {
    if (!this.initialized) {
      this.initialized = true;
      this.classList.add("split");
    }

    this.observer = new MutationObserver(this.onChildNodesChange);
    this.observer.observe(this, { childList: true });
  }

  disconnectedCallback() {
    this.observer.disconnect();
    this.observer = null;
  }

  onChildNodesChange() {
    switch (this.children.length) {
      case 0:
        this.parentNode.removeChild(this);
        return;
      case 1: {
        const $child = this.children[0];
        this.parentNode.insertBefore($child, this);
        this.parentNode.removeChild(this);
        return;
      }
    }
    Array.from(this.children).forEach((item) => {
      if(item.tagName.toLowerCase() === "hv-split" && item.getAttribute("orientation") === this.getAttribute("orientation")) {
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

import { CustomElement, $, bindAll, smoothen } from "../dom.js";

export const isDivider = ($el) => $el.classList.contains("divider");

export class Split extends CustomElement {
  static customAttributes = {
    orientation: { type: "string", defaultValue: "horizontal" },
  };
  static observedAttributes = Object.keys(Split.customAttributes);

  constructor() {
    super();
    this.classList.add("split");


    this._events = [
      [this, { mousedown: this.onDividerDragStart.bind(this) }],
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this.observer = new MutationObserver(this.onChildNodesChange.bind(this));
    this.observer.observe(this, { childList: true });
    this.onChildNodesChange();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.observer.disconnect();
    this.observer = null;
  }

  onChildNodesChange() {
    const components = Array.from(this.children).filter(el => !isDivider(el));
    switch (components.length) {
      case 0: {
        this.remove();
        return;
      }
      case 1: {
        const $child = components[0];
        $child.style.setProperty("flex", this.style.flex);
        this.parentNode.insertBefore($child, this);
        this.remove();
        return;
      }
    }

    // remove divider as first child
    if (isDivider(this.children[0])) {
      this.removeChild(this.children[0]);
      return;
    }

    // remove divider as last child
    if (isDivider(this.children[this.children.length - 1])) {
      this.removeChild(this.children[this.children.length - 1]);
      return;
    }

    let i = 1;
    while (this.children[i]) {
      if (isDivider(this.children[i - 1])) {
        // remove divider next to a divider
        if (isDivider(this.children[i])) {
          this.removeChild(this.children[i]);
          return;
        }
      } else if (!isDivider(this.children[i])) {
        // add divider in between two components
        this.children[i].insertAdjacentElement("beforebegin", $("div", { class: "divider" }));
        return;
      }
      i++;
    }
  }

  onDividerDragStart({ target: divider }) {
    if (divider.parentNode !== this || !divider.classList.contains("divider")) return;

    divider.classList.add("active");
    const getSize = this.orientation === "horizontal" ? (rect) => rect.width : (rect) => rect.height;
    const getOffset = this.orientation === "horizontal" ? (rect) => rect.x : (rect) => rect.y;

    const prevElement = divider.previousElementSibling;
    const nextElement = divider.nextElementSibling;
    const prevRect = prevElement.getBoundingClientRect();
    const nextRect = nextElement.getBoundingClientRect();

    const containerSize = getSize(this.getBoundingClientRect());
    const maxSize = getSize(prevRect) + getSize(nextRect);

    const unbind = bindAll(document.body, {
      mousemove: smoothen(({ clientX, clientY }) => {
        const mouseOffset = this.orientation === "horizontal" ? clientX : clientY;
        const newSize = Math.max(10, Math.min((mouseOffset - getOffset(prevRect)), maxSize * 0.9) / containerSize * 100);
        prevElement.style.setProperty("flex", `1 1 ${newSize}%`);
        nextElement.style.setProperty("flex", `1 1 ${(maxSize / containerSize * 100) - newSize}%`);
      }),
      mouseup() {
        unbind();
        divider.classList.remove("active");
      }
    });
  }

  getSize() {
    const rect = this.getBoundingClientRect();
    return this.orientation === "horizontal" ? rect.width : rect.height;
  }

  updateChildSize($child) {
    const getComponentSize = this.orientation === "horizontal" ? (rect) => rect.width : (rect) => rect.height;
    const maxSize = this.getSize();
    const cumulatedSize = [...this.children].reduce(
      (size, c) => c === $child ? size : size + getComponentSize(c.getBoundingClientRect()),
      0
    );
    const newSize = (maxSize - cumulatedSize) / maxSize * 100;
    $child.style.setProperty("flex", `1 1 ${newSize}%`);
  }
}

customElements.define("hv-split", Split);


import { CustomElement, $, bindAll } from "../dom.js";

export const isKnob = ($el) => $el.classList.contains("hv-knob");

const fields = {
  orientation: { type: "string", defaultValue: "horizontal" },
};

export class Split extends CustomElement {
  static observedAttributes = ["orientation"];

  constructor() {
    super(fields);
    this.classList.add("split");


    this._events = [
      [this, {
        mousedown: this.onKnobDragStart.bind(this)
      }, true],
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
    const components = Array.from(this.children).filter(el => !isKnob(el));
    switch (components.length) {
      case 0: {
        this.remove();
        return;
      }
      case 1: {
        const $child = components[0];
        $child.style.flex = this.style.flex;
        this.parentNode.insertBefore($child, this);
        this.remove();
        return;
      }
    }

    // remove knob as first child
    if (isKnob(this.children[0])) {
      this.removeChild(this.children[0]);
      return;
    }

    // remove knob as last child
    if (isKnob(this.children[this.children.length - 1])) {
      this.removeChild(this.children[this.children.length - 1]);
      return;
    }

    let i = 1;
    while (this.children[i]) {
      if (isKnob(this.children[i - 1])) {
        // remove knob next to a knob
        if (isKnob(this.children[i])) {
          this.removeChild(this.children[i]);
          return;
        }
      } else if (!isKnob(this.children[i])) {
        // add knob in between two components
        this.children[i].insertAdjacentElement("beforebegin", $("div", { class: "hv-knob" }));
        return;
      }
      i++;
    }
  }

  onKnobDragStart({ target: knob }) {
    if (knob.parentNode === this && knob.classList.contains("hv-knob")) {
      knob.classList.add("active");
      const getSize = this.orientation === "horizontal" ? (rect) => rect.width : (rect) => rect.height;
      const getOffset = this.orientation === "horizontal" ? (rect) => rect.x : (rect) => rect.y;

      const prevElement = knob.previousElementSibling;
      const nextElement = knob.nextElementSibling;
      const prevRect = prevElement.getBoundingClientRect();
      const nextRect = nextElement.getBoundingClientRect();

      const containerSize = getSize(this.getBoundingClientRect());
      const maxSize = getSize(prevRect) + getSize(nextRect);

      let ref;
      const unbind = bindAll(document.body, {
        mousemove: (ev) => {
          const mouseOffset = this.orientation === "horizontal" ? ev.clientX : ev.clientY;
          cancelAnimationFrame(ref);
          ref = requestAnimationFrame(() => {
            const newSize = Math.max(10, Math.min((mouseOffset - getOffset(prevRect)), maxSize * 0.9) / containerSize * 100);
            prevElement.style.flex = `1 1 ${newSize}%`;
            nextElement.style.flex = `1 1 ${(maxSize / containerSize * 100) - newSize}%`;
          })
        },
        mouseup: () => {
          unbind();
          knob.classList.remove("active");
        }
      }, true);
    }
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
    $child.style.flex = `1 1 ${newSize}%`;
  }
}

customElements.define("hv-split", Split);


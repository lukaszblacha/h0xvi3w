import { $, bindAll, CustomElement, smoothen } from "../dom.js";
import { normalizeNumber, } from "../utils/numbers.js";

const measureTools = (orientation) => ({
  getSize: (el) => orientation === "horizontal" ? el.offsetWidth : el.offsetHeight,
  getOffset: (el) => el.getBoundingClientRect()[orientation === "horizontal" ? "x" : "y"],
  getCursorOffset: (ev) => orientation === "horizontal" ? ev.clientX : ev.clientY,
});

export class Scrollbar extends CustomElement {
  static customAttributes = {
    position: { type: "number", defaultValue: 0 },
    containerScrollSize: { type: "number", defaultValue: 1 },
    containerSize: { type: "number", defaultValue: 1 },
    orientation: { type: "string", defaultValue: "vertical" },
  };
  static observedAttributes = Object.keys(Scrollbar.customAttributes);

  constructor() {
    super();

    this.$handle = $("div", { class: "scrollbar-handle" });
    this.appendChild(this.$handle);

    this.render = smoothen(this.render.bind(this));
    this.onWheel = this.onWheel.bind(this);

    this._events = [
      [this, {
        wheel: this.onWheel,
        click: this.onClick.bind(this),
      }],
      [this.$handle, {
        mousedown: this.onDragStart.bind(this),
      }]
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if ([undefined, null, "null", "undefined"].includes(newValue)) return this.setAttribute(name, this.fields[name].defaultValue);
    if (oldValue === newValue) return;

    switch (name) {
      case "containerScrollSize": {
        if (newValue < 1) {
          return this.containerScrollSize = 1;
        }
        break;
      }
      case "containerSize": {
        if (newValue < 1) {
          return this.containerSize = 1;
        }
        break;
      }
    }

    if (!this.hasAttribute("disabled") && this.containerSize >= this.containerScrollSize) {
      this.setAttribute("disabled", true);
    } else if (this.hasAttribute("disabled") && this.containerSize < this.containerScrollSize) {
      this.removeAttribute("disabled");
    }

    if (Scrollbar.observedAttributes.includes(name)) {
      this.render();
    }
  }

  get maxScrollPosition() {
    const { containerScrollSize, containerSize } = this;
    return Math.max(0, containerScrollSize - containerSize);
  }

  render() {
    const { position, maxScrollPosition, containerSize, orientation } = this;
    const offset = orientation === "horizontal" ? this.offsetWidth : this.offsetHeight;
    let handleSize = Math.max(20, (offset / maxScrollPosition) * containerSize);
    this.style.setProperty("--handle-size", `${handleSize}px`);
    this.style.setProperty("--progress", position / maxScrollPosition);
  }

  onClick(e) {
    if (e.target !== this) return;
    const { position, maxScrollPosition, $handle, orientation } = this;
    const { getCursorOffset, getOffset, getSize } = measureTools(orientation);

    const gap = getSize($handle) / 2 + parseFloat(getComputedStyle(this).getPropertyValue("--handle-gap"));
    const cursorOffset = getCursorOffset(e) - getOffset(this);

    const progress = (cursorOffset - gap) / (getSize(this) - gap - gap);
    this.position = normalizeNumber(progress * maxScrollPosition, 0, maxScrollPosition);
    this.triggerScrollEvent(position, this.position);
  }

  onDragStart(e) {
    const { orientation, $handle, maxScrollPosition } = this;
    const { getCursorOffset, getOffset, getSize } = measureTools(orientation);

    const gap = getSize($handle) / 2 + parseFloat(getComputedStyle(this).getPropertyValue("--handle-gap"));
    let delta = (getCursorOffset(e) - getOffset($handle)) - getSize($handle) / 2;

    const unbind = bindAll(document.body, {
      mousemove: smoothen((ev) => {
        const { position } = this;
        const cursorOffset = getCursorOffset(ev) - getOffset(this);

        const progress = (cursorOffset - gap - delta) / (getSize(this) - gap - gap);
        this.position = normalizeNumber(progress * maxScrollPosition, 0, maxScrollPosition);
        this.triggerScrollEvent(position, this.position);
      }),
      mouseup() {
        unbind();
      },
      mouseenter(e) {
        if(!e.buttons) unbind();
      }
    });
  }

  onWheel(e) {
    const { position, maxScrollPosition, orientation } = this;
    const delta = orientation === "horizontal" ? e.deltaX : e.deltaY;
    this.position = normalizeNumber(position + delta, 0, maxScrollPosition);
    this.triggerScrollEvent(position, this.position);
  }

  triggerScrollEvent(previousPosition, position) {
    const { orientation } = this;
    this.trigger(
      orientation === "horizontal" ? "hscroll" : "vscroll",
      { orientation, previousPosition, position },
    )
  }
}
customElements.define("hv-scrollbar", Scrollbar);

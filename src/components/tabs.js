import { $, bindAll, CustomElement, unbindAll } from "../dom.js";
import { Split } from "./split.js";

const fields = {
  "tabs-position": { type: "string", defaultValue: "top" }
};

export class Tabs extends CustomElement {
  static observedAttributes = Object.keys(fields);

  constructor(content) {
    super(fields);
    this.activeTabIndex = 0;
    this.initialized = false;
    this.classList.add("tabs");

    this.onDragOver = this.onDragOver.bind(this);

    this.$list = $("ul", { class: "tabs-list" });
    this.$container = $("div", { class: "tabs-container" }, content);
    this.appendChild(this.$list);
    this.appendChild(this.$container);

    this._events = [
      [this.$list, {
        click: this.onListItemClick.bind(this),
        dragstart: this.onTabDragStart.bind(this)
      }],
      [this.$container, {
        dragenter: this.onDragEnter.bind(this),
        dragleave: this.onDragLeave.bind(this),
        drop: this.onDrop.bind(this)
      }]
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this.observer = new MutationObserver(this.onChildListChange.bind(this));
    this.observer.observe(this.$container, { childList: true });
    this.onChildListChange();
  }

  disconnectedCallback() {
    unbindAll(this.$container, { dragover: this.onDragOver }, false);
    this.observer.disconnect();
    this.observer = null;
    super.disconnectedCallback();
  }

  setActiveTabIndex(index) {
    if (index >= 0) {
      this.activeTabIndex = index;
      Array.from(this.$list.children).map(($el, i) => {
        if (i === index) {
          $el.classList.add("active");
        } else {
          $el.classList.remove("active");
        }
      });
      Array.from(this.$container.children).map(($el, i) => {
        if (i === index) {
          $el.classList.add("active-tab");
        } else {
          $el.classList.remove("active-tab");
        }
      });
    }
  }

  onTabDragStart(e) {
    // eslint-disable-next-line no-prototype-builtins
    if (!e.target.dataset?.hasOwnProperty('index')) return;
    const index = parseInt(e.target.dataset.index);
    e.dataTransfer.dropEffect = "move";
    e.dataTransfer.effectAllowed = "move";
    Array.from(document.querySelectorAll("[dnd-source-tab]")).forEach(n => n.removeAttribute("dnd-source-tab"));
    this.$container.children[index].setAttribute("dnd-source-tab", true);
  }

  onChildListChange() {
    const $children = Array.from(this.$container.children);
    if (this.isConnected && $children.length === 0) {
      this.remove();
      return;
    }

    for (let $c of $children) {
      if ($c.classList.contains("tabs")) {
        $c.replaceWith($c.querySelector(".tabs-container > *"));
        return; // Flatten the dom structure
      }
    }

    const labels = $children.map(($el, i) => ({
      label: $el.getAttribute("label") || `Tab ${i}`,
      disposable: $el.hasAttribute("disposable") && $el.getAttribute("disposable") !== "false",
    }));

    this.$list.innerText = "";
    labels.map(({ label, disposable }, index) => {
      const $el = $(
        "li",
        { draggable: true, "data-index": index, class: index === this.activeTabIndex ? "active" : undefined },
        [label, disposable && $("span", { title: `Close "${label}" window`, class: "close" }, "✕")].filter(Boolean)
      );
      this.$list.appendChild($el);
    });

    this.setActiveTabIndex(this.activeTabIndex >= $children.length ? $children.length - 1 : this.activeTabIndex);
  }

  onListItemClick({ target }) {
    if (target.tagName.toLowerCase() === "li") {
      this.setActiveTabIndex(Array.from(target.parentNode.children).indexOf(target));
    } else if (target.tagName.toLowerCase() === "span") {
      this.$container.removeChild(this.$container.children[parseInt(target.parentNode.dataset.index)]);
    }
  }

  onDragEnter(e) {
    const $source = document.querySelector("[dnd-source-tab]");
    if ($source) {
      bindAll(this.$container, { dragover: this.onDragOver }, false);
    }
  }

  onDragOver(e) {
    const $source = document.querySelector("[dnd-source-tab]");
    if (!$source) {
      return;
    }

    e.preventDefault();
    const { layerX, layerY } = e;
    const { width, height } = this.$container.getBoundingClientRect();
    const [px, py] = [
      1 - (width - layerX) / width,
      1 - (height - layerY) / height
    ];

    let className = "drop-center";
    if (px < 0.2) {
      className = "drop-left";
    } else if (px > 0.8) {
      className = "drop-right";
    } else if (py < 0.2) {
      className = "drop-top";
    } else if (py > 0.8) {
      className = "drop-bottom";
    }

    if (!this.$container.classList.contains(className)) {
      this.$container.classList.add(className);
      const classes = Array.from(this.$container.classList).filter(c => c.startsWith("drop-") && c !== className);
      if (classes.length) this.$container.classList.remove(classes);
    }
  }

  onDragLeave(e) {
    unbindAll(e.currentTarget, { dragOver: this.onDragOver }, false);

    if (e.currentTarget !== this.$container) return;
    this.$container.classList.remove("drop-top", "drop-left", "drop-right", "drop-bottom", "drop-center");
  }

  onDrop(e) {
    unbindAll(this.$container, { dragover: this.onDragOver }, false);

    const $source = document.querySelector("[dnd-source-tab]");
    $source.removeAttribute("dnd-source-tab");
    const className = Array.from(this.$container.classList).filter(c => c.startsWith("drop-"))[0];
    this.$container.classList.remove(className);

    if (className === "drop-center") {
      this.$container.appendChild($source);
      this.setActiveTabIndex(this.$container.children.length - 1);
    } else {
      const $split = new Split();
      const $parent = this.parentNode;
      const $placeholder = $("div"); // to keep DOM mutation event handlers happy
      $parent.replaceChild($placeholder, this);
      const splitContent = (["drop-top", "drop-left"].includes(className))
        ? [new Tabs($source), this]
        : [this, new Tabs($source)];
      splitContent.forEach(el => $split.appendChild(el));
      $split.setAttribute("orientation", ["drop-left", "drop-right"].includes(className) ? "horizontal" : "vertical");
      $parent.replaceChild($split, $placeholder);
      $parent.updateChildSize($split);
    }
  }
}
customElements.define("hv-tabs", Tabs);

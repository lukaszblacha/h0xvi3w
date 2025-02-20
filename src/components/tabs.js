import { $, bindAll, unbindAll } from "../dom.js";
import { Split } from "./split.js";

export class Tabs extends HTMLElement {
  static observedAttributes = ["tabs-position"];

  constructor(content) {
    super();
    this.initialContent = content;
    this.activeTabIndex = 0;
    this.initialized = false;

    this.onListItemClick = this.onListItemClick.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onDragLeave = this.onDragLeave.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.onChildListChange = this.onChildListChange.bind(this);
    this.onTabDragStart = this.onTabDragStart.bind(this);
    this.setActiveTabIndex = this.setActiveTabIndex.bind(this);
  }

  connectedCallback() {
    if (!this.initialized) {
      this.initialized = true;
      this.classList.add("tabs");
      this.$list = $("ul", { class: "tabs-list" });
      this.$container = $("div", { class: "tabs-container" }, this.initialContent);
      delete this.initialContent;
      this.appendChild(this.$list);
      this.appendChild(this.$container);
    }

    bindAll(this.$list, { click: this.onListItemClick });
    bindAll(this.$container, {
      dragover: this.onDragOver,
      dragleave: this.onDragLeave,
      drop: this.onDrop
    });
    this.observer = new MutationObserver(this.onChildListChange);
    this.observer.observe(this.$container, { childList: true });
    this.onChildListChange();
  }

  disconnectedCallback() {
    this.observer.disconnect();
    this.observer = null;
    unbindAll(this.$list, { click: this.onListItemClick });
    unbindAll(this.$container, {
      dragover: this.onDragOver,
      dragleave: this.onDragLeave,
      drop: this.onDrop
    });
  }

  setActiveTabIndex(index) {
    if (index >= 0) {
      this.activeTabIndex = index;
      Array.from(this.$list.children).map(($el, i) => {
        if(i === index) {
          $el.classList.add("active");
        } else {
          $el.classList.remove("active");
        }
      });
      Array.from(this.$container.children).map(($el, i) => {
        if(i === index) {
          $el.classList.add("active-tab");
        } else {
          $el.classList.remove("active-tab");
        }
      });
    }
  }

  onTabDragStart(e) {
    const index = parseInt(e.target.dataset.index);
    e.dataTransfer.dropEffect = "move";
    e.dataTransfer.effectAllowed = "move";
    Array.from(document.querySelectorAll("[dnd-source]")).forEach(n => n.removeAttribute("dnd-source"));
    this.$container.children[index].setAttribute("dnd-source", true);
  }

  onChildListChange() {
    const $children = Array.from(this.$container.children);
    if (this.isConnected && $children.length === 0) {
      this.parentNode.removeChild(this);
      return;
    }

    for (let $c of $children) {
      if ($c.classList.contains("tabs")) {
        $c.replaceWith($c.querySelector(".tabs-container > *"));
        return; // Flatten the dom structure
      }
    }

    const labels = $children.map(($el, i) => $el.getAttribute("label") || `Tab ${i}`);

    Array.from(this.$list.children).forEach($el => {
      $el.removeEventListener("dragstart", this.onTabDragStart);
      this.$list.removeChild($el);
    });

    labels.map((label, index) => {
      const $el = $("li", { draggable: true, "data-index": index, class: index === this.activeTabIndex ? "active" : undefined }, label);
      $el.addEventListener("dragstart", this.onTabDragStart);
      this.$list.appendChild($el);
    });

    this.setActiveTabIndex(this.activeTabIndex >= $children.length ? $children.length - 1 : this.activeTabIndex);
  }

  onListItemClick({ target }) {
    if (target.tagName.toLowerCase() === "li") {
      this.setActiveTabIndex(Array.from(target.parentNode.children).indexOf(target));
    }
  }

  onDragOver(e) {
    const { layerX, layerY } = e;
    if (e.target.parentNode !== e.currentTarget) {
      e.preventDefault();
    }

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

    if(!this.$container.classList.contains(className)) {
      this.$container.classList.add(className);
      const classes = Array.from(this.$container.classList).filter(c => c.startsWith("drop-") && c !== className);
      if (classes.length) this.$container.classList.remove(classes);
    }
  }

  onDragLeave() {
    this.$container.classList.remove("drop-top", "drop-left", "drop-right", "drop-bottom", "drop-center");
  }

  onDrop() {
    const $source = document.querySelector("[dnd-source]");
    const className = Array.from(this.$container.classList).filter(c => c.startsWith("drop-"))[0];
    this.$container.classList.remove(className);

    if (className === "drop-center") {
      this.$container.appendChild($source);
      this.setActiveTabIndex(this.$container.children.length - 1);
    } else {
      const split = new Split();
      this.parentNode.insertBefore(split, this);
      const splitContent = (["drop-top", "drop-left"].includes(className))
        ? [new Tabs($source), this]
        : [this, new Tabs($source)];
      splitContent.forEach(el => split.appendChild(el));
      split.setAttribute("orientation", ["drop-left", "drop-right"].includes(className) ? "horizontal" : "vertical");
    }
  }
}
customElements.define("hv-tabs", Tabs);

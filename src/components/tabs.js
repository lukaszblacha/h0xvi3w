import { $, bindAll, cn, unbindAll } from "../dom.js";
import { Split } from "./split.js";
import { bindClassMethods } from "../utils/classes.js";

export class Tabs extends EventTarget {
  constructor(attributes = {}, content) {
    super();
    bindClassMethods(this);

    this.$element = $.div({ ...attributes, class: cn("tabs", attributes.class) }, [
      $.ul({ class: "tabs-list" }),
      $.div({ class: "tabs-container" }, content),
    ]);

    [this.$list, this.$container] = this.$element.querySelectorAll("& > *");
    this.activeTabIndex = 0;

    this.observer = new MutationObserver(this.onDomChange);
    const { $list, $container, onListItemClick, onDragOver, onDragLeave, onDrop, onDomChange, observer } = this;
    bindAll($list, { click: onListItemClick });
    bindAll($container, {
      dragover: onDragOver,
      dragleave: onDragLeave,
      drop: onDrop
    });
    observer.observe($container, { childList: true });
    onDomChange();
  }

  destroy() {
    const { observer, $element, $list, $container, onListItemClick, onDragOver, onDragLeave, onDrop } = this;
    observer.disconnect();
    unbindAll($list, { click: onListItemClick });
    unbindAll($container, {
      dragover: onDragOver,
      dragleave: onDragLeave,
      drop: onDrop
    });
    $element.parentNode?.removeChild($element);
  }

  setActiveTabIndex(index) {
    const { $list, $container } = this;
    if (index >= 0) {
      this.activeTabIndex = index;
      Array.from($list.children).map(($el, i) => {
        if(i === index) {
          $el.classList.add("active");
        } else {
          $el.classList.remove("active");
        }
      });
      Array.from($container.children).map(($el, i) => {
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
    const { $container } = this;
    e.dataTransfer.dropEffect = "move";
    e.dataTransfer.effectAllowed = "move";
    Array.from(document.querySelectorAll("[dnd-source]")).forEach(n => n.removeAttribute("dnd-source"));
    $container.children[index].setAttribute("dnd-source", true);
  }

  onDomChange() {
    const { activeTabIndex, $element, $list, $container, onTabDragStart, setActiveTabIndex, destroy } = this;
    const $parent = $element.parentNode;
    const $children = Array.from($container.children);
    if ($parent && $children.length === 0) {
      destroy();
      return;
    }

    const labels = $children.map(($el, i) => $el.getAttribute("label") || `Tab ${i}`);

    Array.from($list.children).forEach(c => {
      unbindAll(c, { dragstart: onTabDragStart });
      c.parentNode.removeChild(c);
    });

    labels.map((label, index) => {
      const $el = $.li({ draggable: true, "data-index": index, class: index === activeTabIndex ? "active" : undefined }, label);
      bindAll($el, { dragstart: onTabDragStart });
      $list.appendChild($el);
    });

    setActiveTabIndex(activeTabIndex >= $children.length ? $children.length - 1 : activeTabIndex);
  }

  onListItemClick({ target }) {
    const { setActiveTabIndex } = this;
    if (target.tagName.toLowerCase() === "li") {
      setActiveTabIndex(Array.from(target.parentNode.children).indexOf(target));
    }
  }

  setTabsPosition(p) {
    const { $element } = this;
    if(p === "bottom") $element.setAttribute("bottom", true);
    $element.removeAttribute("bottom");
    return this;
  }

  onDragOver(e) {
    const { $container } = this;
    const { layerX, layerY } = e;
    if (e.target.parentNode !== e.currentTarget) {
      e.preventDefault();
    }

    const { width, height } = $container.getBoundingClientRect();
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

    if(!$container.classList.contains(className)) {
      $container.classList.add(className);
      const classes = Array.from($container.classList).filter(c => c.startsWith("drop-") && c !== className);
      if (classes.length) $container.classList.remove(classes);
    }
  }

  onDragLeave() {
    const { $container } = this;
    $container.classList.remove("drop-top", "drop-left", "drop-right", "drop-bottom", "drop-center");
  }

  onDrop() {
    const { $element, $container, setActiveTabIndex } = this;
    const $source = document.querySelector("[dnd-source]");
    const $parent = $element.parentNode;

    const className = Array.from($container.classList).filter(c => c.startsWith("drop-"))[0];
    if (className === "drop-center") {
      $container.appendChild($source);
      setActiveTabIndex($container.children.length - 1);
    } else {
      const $placeholder = $parent.insertBefore($.div(), $element);
      const splitContent = (["drop-top", "drop-left"].includes(className))
        ? [new Tabs({}, $source), $element]
        : [$element, new Tabs({}, $source)];
      const splitOrientation = ["drop-left", "drop-right"].includes(className) ? "horizontal" : "vertical";
      const split = new Split({}, splitContent).setOrientation(splitOrientation);
      $placeholder.replaceWith(split.$element);
    }
    $container.classList.remove("drop-top", "drop-left", "drop-right", "drop-bottom", "drop-center");
  }
}

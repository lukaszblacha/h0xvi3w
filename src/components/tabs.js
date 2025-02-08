import { $, bindAll, cn, unbindAll } from "../dom.js";
import { $split } from "./split.js";

export const $tabs = (attributes = {}, content) => {
  const $element = $.div({ ...attributes, class: cn("tabs", attributes.class) }, [
    $.ul({ class: "tabs-list" }),
    $.div({ class: "tabs-container" }, content),
  ]);

  const [$list, $container] = $element.querySelectorAll("& > *");
  let activeTabIndex = 0;

  function setActiveTabIndex(index) {
    if (index >= 0) {
      activeTabIndex = index;
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

  function onTabDragStart(e) {
    const index = parseInt(e.target.dataset.index);
    e.dataTransfer.dropEffect = "move";
    e.dataTransfer.effectAllowed = "move";
    Array.from(document.querySelectorAll("[dnd-source]")).forEach(n => n.removeAttribute("dnd-source"));
    $container.children[index].setAttribute("dnd-source", true);
  }

  function destroy() {
    observer.disconnect();
    $element.parentNode?.removeChild($element);
    // TODO: unbind everything
  }

  function onDomChange() {
    const $parent = $element.parentNode;
    const $children = Array.from($container.children);
    if ($parent && $children.length == 0) {
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

  const observer = new MutationObserver(onDomChange);
  observer.observe($container, { childList: true });
  onDomChange();

  function onListItemClick({ target }) {
    if (target.tagName.toLowerCase() === "li") {
      setActiveTabIndex(Array.from(target.parentNode.children).indexOf(target));
    }
  }

  bindAll($list, { click: onListItemClick });
  bindAll($container, {
    dragover: (e) => {
      if (e.target.parentNode !== e.currentTarget) {
        e.preventDefault();
      }

      const { width, height } = $container.getBoundingClientRect();
      const [px, py] = [
        1 - (width - e.layerX) / width,
        1 - (height - e.layerY) / height
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
    },
    dragleave() {
      $container.classList.remove("drop-top", "drop-left", "drop-right", "drop-bottom", "drop-center");
    },
    drop() {
      const $source = document.querySelector("[dnd-source]");
      const $parent = $element.parentNode;

      const className = Array.from($container.classList).filter(c => c.startsWith("drop-"))[0];
      if (className === "drop-center") {
        $container.appendChild($source);
        setActiveTabIndex($container.children.length - 1);
      } else {
        const $placeholder = $parent.insertBefore($.div(), $element);
        const splitContent = (["drop-top", "drop-left"].includes(className))
          ? [$tabs({}, $source), $element]
          : [$element, $tabs({}, $source)];
        const splitOrientation = ["drop-left", "drop-right"].includes(className) ? "horizontal" : "vertical";
        const split = $split({}, splitContent).setOrientation(splitOrientation);
        $placeholder.replaceWith(split.$element);
      }
      $container.classList.remove("drop-top", "drop-left", "drop-right", "drop-bottom", "drop-center");
    }
  });

  const obj = { $element, setActiveTabIndex };

  obj.setTabsPosition = (p) => {
    if(p === "bottom") $element.setAttribute("bottom", true);
    $element.removeAttribute("bottom");
    return obj;
  }

  return obj;
}

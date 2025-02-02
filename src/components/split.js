import { $, cn } from "../dom.js";

const isSplitElement = ($el) => $el.classList.contains("split");

export const $split = (attributes = {}, content) => {
  const $element = $.div({ ...attributes, class: cn("split", attributes.class) }, content);

  function destroy() {
    observer.disconnect();
    $element.parentNode?.removeChild($element);
  }

  const observer = new MutationObserver(() => {
    const $parent = $element.parentNode;
    if($parent) {
      switch ($element.children.length) {
        case 0:
          destroy();
          break;
        case 1: {
          const $child = $element.children[0];
          if (isSplitElement($child)) {
            $parent.insertBefore($child, $element);
            destroy();
          }
        }
      }
    }
  });
  observer.observe($element, { childList: true });

  const obj = { $element, destroy };
  obj.setOrientation = (o) => {
    if (o === "vertical") $element.setAttribute("vertical", true);
    else $element.removeAttribute("vertical");
    return obj;
  }

  return obj;
}

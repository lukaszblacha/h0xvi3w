import { $, cn } from "../dom.js";
import { bindClassMethods } from "../utils/classes.js";

export class Split extends EventTarget {
  constructor(attributes = {}, content) {
    super();
    bindClassMethods(this);
    this.$element = $.div({...attributes, class: cn("split", attributes.class)}, content);

    const { $element, destroy } = this;
    this.observer = new MutationObserver(() => {
      const $parent = $element.parentNode;
      if ($parent) {
        switch ($element.children.length) {
          case 0:
            destroy();
            break;
          case 1: {
            const $child = $element.children[0];
            $parent.insertBefore($child, $element);
            destroy();
          }
        }
      }
    });
    this.observer.observe(this.$element, { childList: true });
  }

  destroy() {
    const { observer, $element } = this;
    observer.disconnect();
    $element.parentNode?.removeChild($element);
  }

  setOrientation(o) {
    const { $element } = this;
    if (o === "vertical") $element.setAttribute("vertical", true);
    else $element.removeAttribute("vertical");
    return this;
  }
}

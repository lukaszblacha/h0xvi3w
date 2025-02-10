import { $, cn } from "../dom.js";

export class Panel extends EventTarget {
  constructor(attributes = {}, { header, body, footer } = {}) {
    super();

    this.$element = $.div(
        { ...attributes, class: cn("panel", attributes.class) },
        [
          header && $.div({ class: "panel-header" }, header),
          body && $.div({ class: "panel-body" }, body),
          footer && $.div({ class: "panel-footer" }, footer),
        ]
    );
  }

  destroy() {
    this.$element.parentNode?.removeChild(this.$element);
  }
}

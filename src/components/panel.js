import { $, cn } from "../dom.js";
import { $tabs } from "./tabs.js";

export const $panel = (attributes = {}, { header, body, footer } = {}) => {
  const { $element } = $tabs({}, [
    $.div(
      { ...attributes, class: cn("panel", attributes.class) },
      [
        header && $.div({ class: "panel-header" }, header),
        body && $.div({ class: "panel-body" }, body),
        footer && $.div({ class: "panel-footer" }, footer),
      ]
    )
  ]);

  return { $element };
};

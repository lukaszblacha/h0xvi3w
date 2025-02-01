import { $, cn } from "../dom.js";

export const $panel = (attributes = {}, { header, body, footer } = {}) => {
  const $element = $.div(
    { ...attributes, class: cn("panel", attributes.class) },
    [
      header && $.div({ class: "panel-header" }, header),
      body && $.div({ class: "panel-body" }, body),
      footer && $.div({ class: "panel-footer" }, footer),
    ]
  );

  return { $element };
};

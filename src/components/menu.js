import { $div, cn } from "../dom.js";

const toMenuItems = (items) => {
  if (!Array.isArray(items)) { return [] };

  return items.map((item) => {
    const items = toMenuItems(item.items);
    const content = items.length > 0 && $div({ class: "submenu" }, items);
    const $el = $div(
      { class: "item", tabIndex: 0 },
      [item.label, item.$element, content]
    );

    if (item.action instanceof Function) {
      // fixme: remove the listener when destroying the dom node
      $el.addEventListener('click', item.action);
    }

    return $el;
  });
}

export const $menu = (obj) => {
  return {
    $element: $div({ class: cn("menu", "main-menu") }, toMenuItems(obj.items))
  };
}

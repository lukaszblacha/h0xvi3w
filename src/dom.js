export const $ = (tag, attributes = {}, content = []) => {
  const $el = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => $el.setAttribute(name, value));
  (Array.isArray(content) ? content : [content])
    .filter(Boolean)
    .forEach(child => {
      const $child = typeof child === "string"
        ? document.createTextNode(child)
        : child.hasOwnProperty('$element') ? child.$element : child
      try {
        $el.appendChild($child)
      } catch(e) {
        console.error(e);
      }
    });
  return $el;
}

export const $div = $.bind(null, "div");
export const $span = $.bind(null, "span");
export const $button = $.bind(null, "button");
export const $input = $.bind(null, "input");
export const $table = $.bind(null, "table");
export const $tr = $.bind(null, "tr");
export const $th = $.bind(null, "th");
export const $td = $.bind(null, "td");
export const $a = $.bind(null, "a");

export const cn = (...args) => args.filter(Boolean).join(" ");

export const bindAll = ($node, events = {}) => {
  Object.entries(events).forEach(([name, handlers = []]) => {
    if (typeof handlers === 'function') handlers = [handlers];
    handlers.forEach(handler => {
      $node.addEventListener(name, handler);
    })
  });
}

export const unbindAll = ($node, events = {}) => {
  Object.entries(events).forEach(([name, handlers = []]) => {
    if (typeof handlers === 'function') handlers = [handlers];
    handlers.forEach(handler => {
      $node.removeEventListener(name, handler);
    })
  });
}

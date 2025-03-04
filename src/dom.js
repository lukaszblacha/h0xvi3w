export const $ = (tag, attributes = {}, content = []) => {
  const $el = document.createElement(tag);
  Object.entries(attributes).forEach(([name, value]) => $el.setAttribute(name, value));
  (Array.isArray(content) ? content : [content])
    .filter(Boolean)
    .forEach(child => {
      const $child = typeof child === "string" ? document.createTextNode(child) : child;
      try {
        $el.appendChild($child)
      } catch(e) {
        console.error(e);
      }
    });
  return $el;
}

export const cn = (...args) => args.filter(Boolean).join(" ");

export const parseAttribute = (obj, name, defaultValue) => {
  const attr = obj.getAttribute(name);
  return [null, "undefined"].includes(attr) ? defaultValue : attr;
}

export const bindAll = ($node, events = {}) => {
  Object.entries(events).forEach(([name, handlers = []]) => {
    if (typeof handlers === "function") handlers = [handlers];
    handlers.forEach(handler => {
      $node.addEventListener(name, handler);
    })
  });
}

export const unbindAll = ($node, events = {}) => {
  Object.entries(events).forEach(([name, handlers = []]) => {
    if (typeof handlers === "function") handlers = [handlers];
    handlers.forEach(handler => {
      $node.removeEventListener(name, handler);
    })
  });
}

export function debounce(fn, ms) {
  let ref;
  return (...args) => {
    clearTimeout(ref);
    ref = setTimeout(() => { fn(...args) }, ms);
  };
};

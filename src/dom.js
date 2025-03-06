/**
 * @param {string} tag
 * @param {Record<string, string>} attributes
 * @param {string|HTMLElement|(string|HTMLElement)[]} content
 */
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

const parseAttribute = (obj, name, defaultValue) => {
  const attr = obj.getAttribute(name);
  return [null, "undefined"].includes(attr) ? defaultValue : attr;
}

export const bindAll = ($node, events = {}, passive = true) => {
  Object.entries(events).forEach(([name, handlers = []]) => {
    if (typeof handlers === "function") handlers = [handlers];
    handlers.forEach(handler => {
      $node.addEventListener(name, handler, { passive });
    })
  });
}

export const unbindAll = ($node, events = {}, passive = true) => {
  Object.entries(events).forEach(([name, handlers = []]) => {
    if (typeof handlers === "function") handlers = [handlers];
    handlers.forEach(handler => {
      $node.removeEventListener(name, handler, { passive });
    })
  });
}

export function debounce(fn, ms) {
  let ref;
  let a = null;
  return (...args) => {
    a = args;
    clearTimeout(ref);
    ref = setTimeout(() => {
      fn(...a);
      a = null;
    }, ms);
  };
}

const toCamelCase = (name) => name.replace(
  /([-][a-z])/g,
  g => g.toUpperCase().replace('-', '')
);

export class CustomElement extends HTMLElement {
  constructor(fields) {
    super();

    this.fields = fields;

    Object.entries(fields).forEach(([name, { type, defaultValue }]) => {
      Object.defineProperty(this, toCamelCase(name), {
        configurable: false,
        enumerable: true,
        get() {
          const attr = parseAttribute(this, name, defaultValue);
          switch (type) {
            case "number": return parseInt(attr, 10);
            case "float": return parseFloat(attr);
            case "bool": return attr !== "false";
            default: return attr;
          }
        },
        set(value) {
          this.setAttribute(name, value);
        }
      })
    });
  }

  trigger(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  connectedCallback() {
    (this._events || []).forEach(([$node, events, passive]) => {
      bindAll($node, events, passive);
    })
  }

  disconnectedCallback() {
    (this._events || []).forEach(([$node, events, passive]) => {
      unbindAll($node, events, passive);
    })
  }
}

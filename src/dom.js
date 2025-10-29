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
      } catch (e) {
        console.error(e);
      }
    });
  return $el;
}

export const cn = (...args) => args.filter(Boolean).join(" ");

export const bindAll = ($node, events = {}, passive = true) => {
  Object.entries(events).forEach(([name, handlers = []]) => {
    if (typeof handlers === "function") handlers = [handlers];
    handlers.forEach(handler => {
      $node.addEventListener(name, handler, { passive });
    })
  });

  return () => {
    unbindAll($node, events, passive)
  };
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

export function smoothen(fn) {
  let id;

  return (...args) => {
    cancelAnimationFrame(id);
    id = requestAnimationFrame(() => fn(...args));
  }
}

export const toCamelCase = (str) => str.replace(
  /([-][a-z])/g,
  g => g.toUpperCase().replace('-', '')
);

export const toKebabCase = (str) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, (char, ofs) => ofs ? "-" : "" + char.toLowerCase());

const prefix = "_internal_";

export class CustomElement extends HTMLElement {
  constructor() {
    super();

    const fields = this.constructor.customAttributes || {};

    Object.defineProperty(this, "getInternalValue", {
      configurable: false,
      enumerable: false,
      value: (name) => {
        return this[`${prefix}${toCamelCase(name)}`];
      }
    });

    Object.defineProperty(this, "setInternalValue", {
      configurable: false,
      enumerable: false,
      value: (name, value) => {
        this[`${prefix}${toCamelCase(name)}`] = value;
      }
    });

    Object.entries(fields).forEach(([name, { type, defaultValue }]) => {
      Object.defineProperty(this, `${prefix}${toCamelCase(name)}`, {
        configurable: false,
        enumerable: false,
        writable: true,
        value: defaultValue,
      });

      Object.defineProperty(this, toCamelCase(name), {
        configurable: false,
        enumerable: true,
        get() {
          return this.getInternalValue(name);
        },
        set(value) {
          let internalValue;
          switch (type) {
            case "number": {
              internalValue = parseInt(value, 10);
              break;
            }
            case "float": {
              internalValue = parseFloat(value);
              break;
            }
            case "bool": {
              internalValue = ![0, false, "false", undefined, null].includes(value);
              break;
            }
            default: internalValue = value;
          }
          this.setInternalValue(name, internalValue);
          this.setAttribute(toKebabCase(name), internalValue);
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

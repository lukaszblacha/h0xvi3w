import { formatMap } from "./struct-format.js";
import { DataBuffer } from "../structures/buffer.js";

const assert = (pred, msg) => {
  if (!pred) throw new Error(msg);
}

export const isBufferLike = (source) => {
  return typeof source === "object" && "toBuffer" in source && typeof source.toBuffer === "function";
}

// Broken concept should be array(length / step).fill...
const range = (length, step = 1) => new Array(length)
  .fill(null)
  .map((_, index) => index * step);

/**
 * @param {string} fmt
 * @returns {Token[]}
 */
function tokenize(fmt) {
  const tokens = [];
  let format = fmt.slice(1);
  let offset = 0;
  while (format.length > 0) {
    let token = { offset, size: 1, length: 1, char: 'x' };

    if (/^[0-9]+/.test(format)) {
      const repStr = format.match(/^[0-9]+/)[0];
      format = format.slice(repStr.length);
      token.length = parseInt(repStr);
    }

    const char = format[0];
    assert(char in formatMap, `Invalid type character "${char}" in format string "${fmt}".`);
    format = format.slice(1);
    token = { ...token, char, size: formatMap[char].size };
    offset += token.size * token.length;
    tokens.push(token);
  }
  return tokens;
}

export const packer = (format, spec) => {
  const endianness = format[0];
  assert(["<", ">"].includes(endianness), `Invalid endianness "${endianness}" in format "${format}."`);
  const tokens = tokenize(format);
  assert(tokens.length > 0, `Invalid format "${format}" provided. Format needs to define at least one data type from the list [${Object.keys(formatMap)}].`);
  const lastToken = tokens[tokens.length - 1];
  const bufferLength = lastToken.offset + lastToken.size * lastToken.length;

  assert(!spec || spec.length === tokens.length, `Invalid spec [${spec}] for format "${format}"`);

  const getTokenAt = (index) => {
    return tokens[index];
  }

  const read = (buffer, index) => {
    assert(buffer.length >= bufferLength, `Invaid buffer size, expected ${bufferLength}, but got ${buffer.length}`);
    const token = tokens[index];
    assert(token, `Invalid index ${index}, must be between 0 and ${tokens.length}`);
    const { offset, char, size, length } = token;

    if (char === 's') return formatMap[char].read(buffer, offset, length * size);

    const val = range(length, size)
      .map((v) => v + offset)
      .map((offset) =>
        formatMap[char].read(buffer, offset, endianness)
      );

    return (length === 1 ? val[0] : val);
  };

  const write = (buffer, index, value) => {
    assert(buffer.length >= bufferLength, `Invaid buffer size, expected ${bufferLength}, but got ${buffer.length}`);
    const { offset, char, size, length } = getTokenAt(index);
    const val = (length > 1 ? value : [value]);
    assert(val.length === length, `Expected ${length} value(s)`);

    range(length, size)
      .map((v) => v + offset)
      .map((offset, index) =>
        formatMap[char].write(buffer, offset, endianness, val[index])
      );
  };

  const get = (buffer, prop) => {
    const index = spec?.indexOf(prop);
    assert(tokens[index], `Invalid prop ${prop}, must be one of [${spec}]`);
    return read(buffer, index);
  }

  const set = (buffer, prop, value) => {
    const index = spec?.indexOf(prop);
    assert(tokens[index], `Invalid prop ${prop}, must be one of [${spec}]`);
    write(buffer, index, value);
  }

  const toArray = (buffer) => {
    return range(tokens.length).map((index) => read(buffer, index));
  };

  function toJSON(buffer) {
    assert (spec && spec.length > 0, `Spec for format "${format}" has not been provided.`);
    return spec.reduce((obj, prop) => ({
      ...obj,
      [prop]: get(buffer, prop),
    }), {});
  }

  function fromJSON(data) {
    const p = from(new DataBuffer(bufferLength));
    Object.entries(data).forEach(([k]) => {
      p.set(k, data[k]);
    });
    return p;
  }

  function from(source = new DataBuffer(0)) {
    let buffer = isBufferLike(source) ? source.toBuffer() : source;

    return Object.freeze({
      bufferLength,
      read: (index) => read(buffer, index),
      write(index, value) {
        write(buffer, index, value);
        return this;
      },
      get: (prop) => get(buffer, prop),
      set(prop, value) {
        set(buffer, prop, value);
        return this;
      },
      toArray: () => toArray(buffer),
      toJSON: () => toJSON(buffer),
      toBuffer: () => buffer,
    });
  }

  return Object.freeze({
    format,
    tokens,
    bufferLength,
    fromJSON,
    from,
  });
}

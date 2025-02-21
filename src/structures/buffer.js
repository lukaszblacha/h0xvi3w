/**
 * @param {Uint8Array} uint8arr
 * @param {number} bits
 * @param {boolean} signed
 * @param {boolean} bigEndian
 * @returns {BigInt}
 */
export function readInt(uint8arr, bits, signed, bigEndian) {
  let numChars = Math.round(bits / 8);
  if (uint8arr.length < numChars) {
    throw new Error(`Unable to read number. Buffer too short`);
  }
  const buf = uint8arr.slice(0, numChars);
  if (!bigEndian) buf.reverse();

  let val = 0n;
  for (let i in buf) {
    val = val * 256n + BigInt(buf[i]);
  }
  if (signed && val >= BigInt((2 ** bits) >> 1)) {
    val = BigInt(-(2 ** bits)) + val;
  }
  return val;
}

/**
 * @param {DataBuffer} buffer
 * @param {number} offset
 * @param {number} bits
 * @param {boolean} signed
 * @param {boolean} bigEndian
 * @param {number|BigInt} _value
 */
export function writeInt(buffer, offset, bits, signed, bigEndian, _value) {
  let numChars = Math.round(bits / 8);
  if (buffer.length < numChars + offset) {
    throw new Error(`Unable to write number. Buffer too short`);
  }

  let value = BigInt(_value);
  if (signed && value >= BigInt((2 ** bits) >> 1)) {
    value = BigInt(-(2 ** bits)) + value;
  }

  const chunk = new Uint8Array(numChars);
  for (let i= 0; i<numChars; i++) {
    chunk[i] = Number(value & 256n);
    value = value >> 8n;
  }
  if (!bigEndian) chunk.reverse();

  buffer.set(chunk, offset);
}

export class DataBuffer extends EventTarget {
  constructor(data = new Uint8Array([]), startOffset = 0, endOffset = data.length) {
    super();
    this.from(data, startOffset, endOffset);
  }

  get length() {
    return this.endOffset - this.startOffset;
  }

  from(data, startOffset = 0, endOffset = data.length) {
    if (data instanceof DataBuffer) {
      this.data = data.data;
    } else if (typeof data === "number") {
      this.data = new Uint8Array(data);
    } else {
      this.data = data;
    }
    this.startOffset = Math.min(startOffset, this.data.length);
    this.endOffset = Math.min(endOffset, this.data.length);
    this.dispatchEvent(new CustomEvent("change", { detail: { startOffset: 0, endOffset: this.length, length: this.length } }));

    return this;
  }

  getBuffer() {
    return this.data.subarray(this.startOffset, this.endOffset);
  }

  set(chunk, startOffset) {
    this.data.set(chunk, startOffset);
    const detail = { startOffset, endOffset: startOffset + chunk.length, length: chunk.length };
    this.dispatchEvent(new CustomEvent("overwrite", { detail }));
    this.dispatchEvent(new CustomEvent("change", { detail }));
    return this;
  }

  insert(chunk, startOffset, endOffset = startOffset) {
    const toRemove = endOffset - startOffset;
    if (this.endOffset + chunk.length - toRemove > this.data.length) {
      const oldCapacity = this.data.length;
      this.data = new Uint8Array([
        ...this.data.subarray(0, this.startOffset + startOffset),
        ...chunk,
        ...this.data.subarray(this.startOffset + endOffset),
        ...(new Array(1024).fill(0)) // margin to lower the frequency of constructing new buffer
      ]);
      this.dispatchEvent(new CustomEvent("resize", { detail: { oldCapacity, newCapacity: this.data.length } }));
    } else {
      this.data.copyWithin(this.startOffset + startOffset + chunk.length, this.startOffset + endOffset);
      if(chunk.length) {
        this.data.set(chunk, this.startOffset + startOffset);
      }
    }
    this.endOffset += chunk.length - toRemove;

    const detail = { startOffset, endOffset, length: chunk.length };
    this.dispatchEvent(new CustomEvent("insert", { detail }));
    this.dispatchEvent(new CustomEvent("change", { detail }));

    return this;
  }

  delete(startOffset, length) {
    this.insert([], this.startOffset + startOffset, this.startOffset + startOffset + length);
    const detail = { startOffset, endOffset: startOffset + length, length: 0 };
    this.dispatchEvent(new CustomEvent("delete", { detail }));
    this.dispatchEvent(new CustomEvent("change", { detail }));

    return this;
  }

  subarray(start, end = this.endOffset) {
    return this.data.subarray(this.startOffset + start, this.startOffset + end);
  }

  slice(start, end = this.endOffset) {
    return this.data.slice(this.startOffset + start, this.startOffset + end);
  }

  at(i) {
    return this.data[this.startOffset + i];
  }

  readUInt8(offset) {
    return readInt(this.subarray(offset), 8, false, false);
  }
  readInt8(offset) {
    return readInt(this.subarray(offset), 8, true, false);
  }
  readUInt16LE(offset) {
    return readInt(this.subarray(offset), 16, false, false);
  }
  readInt16LE(offset) {
    return readInt(this.subarray(offset), 16, true, false);
  }
  readUInt16BE(offset) {
    return readInt(this.subarray(offset), 16, false, true);
  }
  readInt16BE(offset) {
    return readInt(this.subarray(offset), 16, true, true);
  }
  readUInt32LE(offset) {
    return readInt(this.subarray(offset), 32, false, false);
  }
  readInt32LE(offset) {
    return readInt(this.subarray(offset), 32, true, false);
  }
  readUInt32BE(offset) {
    return readInt(this.subarray(offset), 32, false, true);
  }
  readInt32BE(offset) {
    return readInt(this.subarray(offset), 32, true, true);
  }
  readUInt64LE(offset) {
    return readInt(this.subarray(offset), 64, false, false);
  }
  readInt64LE(offset) {
    return readInt(this.subarray(offset), 64, true, false);
  }
  readUInt64BE(offset) {
    return readInt(this.subarray(offset), 64, false, true);
  }
  readInt64BE(offset) {
    return readInt(this.subarray(offset), 64, true, true);
  }
  readString(start, end) {
    return String.fromCharCode(...Array.from(this.subarray(start, end)));
  }
  writeUInt8(offset, value) {
    return writeInt(this, offset, 8, false, false, value);
  }
  writeInt8(offset, value) {
    return writeInt(this, offset, 8, true, false, value);
  }
  writeUInt16LE(offset, value) {
    return writeInt(this, offset, 16, false, false, value);
  }
  writeInt16LE(offset, value) {
    return writeInt(this, offset, 16, true, false, value);
  }
  writeUInt16BE(offset, value) {
    return writeInt(this, offset, 16, false, true, value);
  }
  writeInt16BE(offset, value) {
    return writeInt(this, offset, 16, true, true, value);
  }
  writeUInt32LE(offset, value) {
    return writeInt(this, offset, 32, false, false, value);
  }
  writeInt32LE(offset, value) {
    return writeInt(this, offset, 32, true, false, value);
  }
  writeUInt32BE(offset, value) {
    return writeInt(this, offset, 32, false, true, value);
  }
  writeInt32BE(offset, value) {
    return writeInt(this, offset, 32, true, true, value);
  }
  writeUInt64LE(offset, value) {
    return writeInt(this, offset, 64, false, false, value);
  }
  writeInt64LE(offset, value) {
    return writeInt(this, offset, 64, true, false, value);
  }
  writeUInt64BE(offset, value) {
    return writeInt(this, offset, 64, false, true, value);
  }
  writeInt64BE(offset, value) {
    return writeInt(this, offset, 64, true, true, value);
  }
  writeString(start, value) {
    return this.set(start, value.split("").map(c => c.charCodeAt(0)));
  }
}

import { bindClassMethods } from "../utils/classes.js";

export class DataBuffer extends EventTarget {
  constructor(data = new Uint8Array([])) {
    super();
    bindClassMethods(this);
    this.from(data);
  }

  from(data) {
    if (data instanceof DataBuffer) {
      this.data = data.data;
    } else {
      this.data = data;
    }
    this.length = this.data.length;
    this.dispatchEvent(new CustomEvent("change", { detail: { startOffset: 0, endOffset: this.length, length: this.length } }));
  }

  getBuffer() {
    return this.data.subarray(0, this.length);
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
    if (this.length + chunk.length - toRemove > this.data.length) {
      const oldCapacity = this.data.length;
      this.data = new Uint8Array([
        ...this.data.subarray(0, startOffset),
        ...chunk,
        ...this.data.subarray(endOffset),
        ...(new Array(1024).fill(0)) // margin to lower the frequency of constructing new buffer
      ]);
      this.dispatchEvent(new CustomEvent("resize", { detail: { oldCapacity, newCapacity: this.data.length } }));
    } else {
      this.data.copyWithin(startOffset + chunk.length, endOffset);
      if(chunk.length) {
        this.data.set(chunk, startOffset);
      }
    }
    this.length += chunk.length - toRemove;

    const detail = { startOffset, endOffset, length: chunk.length };
    this.dispatchEvent(new CustomEvent("insert", { detail }));
    this.dispatchEvent(new CustomEvent("change", { detail }));

    return this;
  }

  delete(startOffset, length) {
    this.insert([], startOffset, startOffset + length);
    const detail = { startOffset, endOffset: startOffset + length, length: 0 };
    this.dispatchEvent(new CustomEvent("delete", { detail }));
    this.dispatchEvent(new CustomEvent("change", { detail }));

    return this;
  }

  subarray(start, end) {
    return this.data.subarray(start, end);
  }

  slice(start, end) {
    return this.data.slice(start, end);
  }

  at(i) {
    return this.data[i];
  }
}

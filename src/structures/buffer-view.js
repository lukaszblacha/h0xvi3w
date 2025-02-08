import { bindClassMethods } from "../utils/classes.js";
import { DataBuffer } from "./buffer.js";

export class DataBufferView extends DataBuffer {
  constructor(data = new Uint8Array([]), startOffset = 0, endOffset = data.length) {
    super(data);
    bindClassMethods(this);
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.length = endOffset - startOffset;
  }

  getBuffer() {
    return super.getBuffer().subarray(this.startOffset, this.endOffset);
  }

  set(chunk, offset) {
    if (offset < 0 || offset + chunk.length > this.length) throw new Error("Data range out of bounds");
    super.set(chunk, offset + this.startOffset);
    return this;
  }

  insert(chunk, startOffset, endOffset) {
    const toRemove = endOffset - startOffset;
    if (startOffset + toRemove > this.length) throw new Error("Data range out of bounds");
    super.insert(chunk, startOffset + this.startOffset, endOffset + this.startOffset);
    return this;
  }

  delete(offset, length) {
    if (offset < 0 || offset + length > this.length) throw new Error("Data range out of bounds");
    super.delete(offset + this.startOffset, length);
    return this;
  }

  subarray(start, end) {
    return super.subarray(
      this.startOffset + start,
      this.startOffset + end
    );
  }

  slice(start, end) {
    return super.slice(
      this.startOffset + start,
      this.startOffset + end
    );
  }

  at(i) {
    if (i > this.length) throw new Error("Data range out of bounds");
    return this.data[i + this.startOffset];
  }
}

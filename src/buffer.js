export class DataBuffer {
  constructor(data = new Uint8Array([])) {
    this.data = data;
    this.length = data.length;
  }

  getBuffer() {
    return this.data.subarray(0, this.length);
  }

  set(data, offset) {
    this.data.set(data, offset);
    return this;
  }

  insert(chunk, startOffset, endOffset = startOffset) {
    const toRemove = endOffset - startOffset;
    if (this.length + chunk.length - toRemove > this.data.length) {
      this.data = new Uint8Array([
        ...this.data.subarray(0, startOffset),
        ...chunk,
        ...this.data.subarray(endOffset),
        ...(new Array(1024).fill(0)) // margin to lower the frequency of constructing new buffer
      ]);
    } else {
      this.data.copyWithin(startOffset + chunk.length, endOffset);
      if(chunk.length) {
        this.data.set(chunk, startOffset);
      }
    }
    this.length += chunk.length - toRemove;
    return this;
  }

  delete(offset, length) {
    return this.insert([], offset, offset + length);
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

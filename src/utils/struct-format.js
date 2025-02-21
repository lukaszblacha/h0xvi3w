export const formatMap = {
  'x': {
    size: 1,
    write(b, o) {
      b.writeUInt8(0, o);
    },
    read() { return undefined; }
  },
  'c': {
    size: 1,
    write(b, o, e, v) {
      b.writeString(o, v[0]);
    },
    read(b, o) {
      return b.readString(o, o + 1);
    },
  },
  'b': {
    size: 1,
    write(b, o, e, v) {
      b.writeInt8(v, o)
    },
    read(b, o) {
      return b.readInt8(o);
    },
  },
  'B': {
    size: 1,
    write(b, o, e, v) {
      b.writeUInt8(v, o);
    },
    read(b, o) {
      return b.readUInt8(o);
    },
  },
  '?': {
    size: 1,
    write(b, o, e, v) {
      b.writeUInt8(v ? 1 : 0, o)
    },
    read(b, o) {
      return Boolean(b.readUInt8(o));
    },
  },
  'h': {
    size: 2,
    write(b, o, e, v) {
      e == '<' ? b.writeInt16LE(v, o) : b.writeInt16BE(v, o);
    },
    read(b, o, e) {
      return e == '<' ? b.readInt16LE(o) : b.readInt16BE(o);
    },
  },
  'H': {
    size: 2,
    write(b, o, e, v) {
      e == '<' ? b.writeUInt16LE(v, o) : b.writeUInt16BE(v, o);
    },
    read(b, o, e) {
      return e == '<' ? b.readUInt16LE(o) : b.readUInt16BE(o);
    },
  },
  'i': {
    size: 4,
    write(b, o, e, v) {
      e == '<' ? b.writeInt32LE(v, o) : b.writeInt32BE(v, o);
    },
    read(b, o, e) {
      return e == '<' ? b.readInt32LE(o) : b.readInt32BE(o);
    },
  },
  'I': {
    size: 4,
    write(b, o, e, v) {
      e == '<' ? b.writeUInt32LE(v, o) : b.writeUInt32BE(v, o);
    },
    read(b, o, e) {
      return e == '<' ? b.readUInt32LE(o) : b.readUInt32BE(o);
    }
  },
  //'l': {},
  //'L': {},
  //'q': {},
  //'Q': {},
  //'e': {},
  'f': {
    size: 4,
    write(b, o, e, v) {
      e == '<' ? b.writeFloatLE(v, o) : b.writeFloatBE(v, o);
    },
    read(b, o, e) {
      return e == '<' ? b.readFloatLE(o) : b.readFloatBE(o);
    },
  },
  'd': {
    size: 8,
    write(b, o, e, v) {
      e == '<' ? b.writeDoubleLE(v, o) : b.writeDoubleBE(v, o);
    },
    read(b, o, e) {
      return e == '<' ? b.readDoubleLE(o) : b.readDoubleBE(o);
    }
  },
  's': {
    size: 1,
    write(b, o, e, v) {
      b.writeString(o, v);
    },
    read(b, o, s = 1) {
      return b.readString(o, o + s);
    },
  },
};

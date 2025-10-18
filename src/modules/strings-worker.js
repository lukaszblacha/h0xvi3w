async function getStrings({ buffer, minLength = 3 }) {
  const offsetArr = [];
  const endArr = [];

  const data = new Uint8Array(buffer);

  let start = null, i;
  for (i = 0; i < data.byteLength; i++) {
    const chr = data[i];
    if (chr >= 0x20 && chr < 0x7f) {
      if (start === null) {
        start = i;
      }
    } else if (start !== null) {
      if (i - start >= minLength) {
        offsetArr.push(start);
        endArr.push(i);
      }
      start = null;
    }
  }
  if (start !== null && i - start >= minLength) {
    offsetArr.push(start);
    endArr.push(i);
  }

  const offsets = new Uint32Array(offsetArr);
  const ends = new Uint32Array(endArr);
  self.postMessage({ offsets, ends, size: offsetArr.length }, [offsets.buffer, ends.buffer]);
}

self.onmessage = ({ data }) => {
  switch (data.action) {
    case "search": {
      return getStrings(data);
    }
    default: {
      throw new Error(`Search Worker: Unknown action "${data.action}"`);
    }
  }
}


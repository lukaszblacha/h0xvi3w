let $canvas;

/**
 * @param {number[]} arr
 * @returns {number}
 */
const avg = (arr) => arr.length < 1 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

/**
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
const toChunks = (arr, size) => {
  if (size < 1) return [arr];
  let i = 0;
  const chunks = [];
  while (i < arr.length) {
    chunks.push(arr.slice(i, i + size));
    i += size;
  }
  return chunks;
}

function setup(data) {
  $canvas = data.$canvas;
}

function render({ buffer, offset, width, bpp, scanline, containerWidth }) {
  if (!$canvas) {
    console.error("trying to render but no canvas present");
    return;
  }

  const start = Date.now();
  const scale = containerWidth / width;
  $canvas.width = containerWidth;
  $canvas.height = Math.ceil(buffer.byteLength / width) * scale;

  const ctx = $canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, $canvas.width, $canvas.height);

  let y = 0;
  let o = offset;
  const data = new Uint8Array(buffer);
  while (o < data.byteLength) {
    const line = toChunks(data.subarray(o, o + width * bpp), bpp)
      .map(avg)
      .map(v => v.toString(16).padStart(2, "0"));

    line.forEach((s, i) => {
      ctx.fillStyle = `#${s}${s}${s}`;
      ctx.fillRect(i, y, 1, 1);
    });
    y++;
    o += width * bpp + scanline;
  }
  console.log(`Render took ${((Date.now() - start) / 1000).toFixed(2)}s`);

  self.postMessage(data);
}

self.onmessage = ({ data }) => {
  switch (data.action) {
    case "setup": {
      return setup(data);
    }
    case "render": {
      return render(data);
    }
    default: {
      throw new Error(`Offscreen Canvas: Unknown action "${data.action}"`);
    }
  }
}


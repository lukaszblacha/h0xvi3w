let $canvas;

/**
 * @param {Uint8Array} arr
 * @returns {number}
 */
const avg = (arr) => arr.length < 1 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;

function setup(data) {
  $canvas = data.$canvas;
}

async function render({ buffer, offset, width, bpp, scanline, containerWidth }) {
  if (!$canvas) {
    console.error("trying to render but no canvas present");
    return;
  }

  const scale = containerWidth / width;
  $canvas.width = containerWidth;
  $canvas.height = Math.ceil(buffer.byteLength / width) * scale;

  const start = Date.now();
  const data = new Uint8Array(buffer);

  let index = 0;
  const img = new ImageData(width, Math.ceil(data.byteLength / width) || 1);
  while (offset < data.byteLength && index < img.data.length) {
    const v = avg(data.subarray(offset, offset + bpp));
    img.data[index++] = v;
    img.data[index++] = v;
    img.data[index++] = v;
    img.data[index++] = 255;
    offset += bpp;
    if (index % width === 0) offset += scanline;
  }
  while (index < img.data.length) {
    img.data[index++] = 0;
  }

  const ctx = $canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, $canvas.width, $canvas.height);
  ctx.drawImage(await createImageBitmap(img), 0, 0, img.width, img.height, 0, 0, $canvas.width, $canvas.height);
  console.log(`Canvas rendered in ${((Date.now() - start) / 1000).toFixed(2)}s`);

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


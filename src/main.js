import { $div, $input } from "./dom.js";
import { $editor } from "./editor.js";
import { $menu } from "./components/menu.js";
import { $split } from "./components/split.js";
import { $valuesExplorer } from "./values-explorer.js";

const $file = $input({ type: "file" });
const menu = $menu({
  items: [
    { label: "?", action: () => alert('notimpl') },
    { label: "File", items: [{ label: 'New', action: () => editor.setData(new Uint8Array(Array(16).fill(0))) }, { label: 'Open', $element: $file }] },
    { label: "Edit", action: () => alert('notimpl') },
    { label: "View", action: () => alert('notimpl') },
    { label: "Window", action: () => alert('notimpl') },
  ]
});

const editor = $editor(16);
const values = $valuesExplorer();
editor.on("select", values.setValue);

const split = $split([editor, values]);
split.setHorizontal();

document.body.appendChild($div({ id: "root" }, [menu, split]));

// Sample data - bmp file
editor.setData(new Uint8Array(
  `424d0000000000000000360000002800000004000000fcffffff010020000000000000000000000000000000000000000000000000000000ff0000ff0000ff000000ffffff000000cc0000cc0000cc000000cccccc000000880000880000880000008888880000004400004400004400000044444400`
    .match(/.{2}/g)
    .map(v => parseInt(`0x${v}`))
));

// Loadfile
$file.addEventListener("change", function () {
  const file = this.files?.[0];
  if (!file) {
    return;
  }
  const fileReader = new FileReader();
  fileReader.onload = function (e) {
    editor.setData(new Uint8Array(e.target.result))
  };
  fileReader.readAsArrayBuffer(file);
});

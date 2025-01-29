import { $div, $input } from "./dom.js";
import { $editor } from "./modules/editor.js";
import { $valuesExplorer } from "./modules/values-explorer.js";
import { $strings } from "./modules/strings.js";
import { $menu } from "./components/menu.js";
import { $split } from "./components/split.js";

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
const strings = $strings(editor);
editor.on("select", values.setValue);

document.body.appendChild($div({ id: "root" },
  $split({}, [
    menu,
    $split({}, [editor, values, strings]).setHorizontal(),
  ]).setVertical()
));

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

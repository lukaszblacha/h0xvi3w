import { $div, $input, bindAll } from "./dom.js";
import { $editor } from "./modules/editor.js";
import { $valuesExplorer } from "./modules/values-explorer.js";
import { $strings } from "./modules/strings.js";
import { $menu } from "./components/menu.js";
import { $split } from "./components/split.js";

const editor = $editor(16);

function createNewBuffer() {
  editor.setBuffer(new Uint8Array(Array(16).fill(0)));
}

function readBufferFromFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.onload = ({ target }) => editor.setBuffer(new Uint8Array(target.result));
  fileReader.readAsArrayBuffer(file);
}

const $file = $input({ type: "file" });
bindAll($file, { change: readBufferFromFile });

const menu = $menu({
  items: [
    { label: "?", action: () => alert('notimpl') },
    { label: "File", items: [{ label: 'New', action: createNewBuffer }, { label: 'Open', $element: $file }] },
    { label: "Edit", action: () => alert('notimpl') },
    { label: "View", action: () => alert('notimpl') },
    { label: "Window", action: () => alert('notimpl') },
  ]
});

const values = $valuesExplorer(editor);
const strings = $strings(editor);

document.body.appendChild($div({ id: "root" },
  $split({}, [
    menu,
    $split({}, [editor, values, strings]).setHorizontal(),
  ]).setVertical()
));

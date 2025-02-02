import { $, bindAll } from "./dom.js";
import { $editor } from "./modules/editor.js";
import { $valuesExplorer } from "./modules/values-explorer.js";
import { $strings } from "./modules/strings.js";
import { $menu } from "./components/menu.js";
import { $split } from "./components/split.js";
import { $tabs } from "./components/tabs.js";

const editor = $editor(16);

function createFile() {
  editor.openFile(new Uint8Array(Array(16).fill(0)));
}

function readBufferFromFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.onload = ({ target }) => editor.openFile(new Uint8Array(target.result), file.name);
  fileReader.readAsArrayBuffer(file);
}

function saveFile() {
  const blob = new Blob([editor.getBuffer()], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const link = $.a({ href: url, download: editor.getFileName() });
  document.body.appendChild(link);
  link.style = 'display: none';
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

const $file = $.input({ type: "file" });
bindAll($file, { change: readBufferFromFile });

const menu = $menu({
  items: [
    { label: "?", action: () => alert('notimpl') },
    { label: "File", items: [
      { label: 'New', action: createFile },
      { label: 'Open', $element: $file },
      { label: 'Save', action: saveFile },
    ]},
    { label: "Edit", action: () => alert('notimpl') },
    { label: "View", action: () => alert('notimpl') },
    { label: "Window", action: () => alert('notimpl') },
  ]
});

const values = $valuesExplorer(editor);
const strings = $strings(editor);

document.body.appendChild($.div({ id: "root" },
  $split({}, [
    menu,
    $split({}, [
      editor,
      $split({}, [
        values,
        strings,  
      ]).setOrientation("vertical"),
    ]).setOrientation("horizontal"),
  ]).setOrientation("vertical")
));

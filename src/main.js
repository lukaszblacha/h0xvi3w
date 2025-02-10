import { $, bindAll } from "./dom.js";
import { HexEditor } from "./modules/editor.js";
import { ValuesExplorer } from "./modules/values-explorer.js";
import { Strings } from "./modules/strings.js";
import { Canvas } from "./modules/canvas.js";
import { MainMenu } from "./components/menu.js";
import { Split } from "./components/split.js";
import { DataBufferView } from "./structures/buffer-view.js";

const editor = new HexEditor(16);

function createFile() {
  const buffer = new DataBufferView(new Uint8Array(Array(16).fill(0)));
  editor.openFile(buffer);
}

function readBufferFromFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.onload = ({ target }) => {
    const buffer = new DataBufferView(new Uint8Array(target.result));
    editor.openFile(buffer, file.name);
  }
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

const menu = new MainMenu({
  items: [
    { label: "?", action: () => alert('notimpl') },
    { label: "File", items: [
      { label: 'New', action: createFile },
      { label: 'Open', $element: $file },
      { label: 'Save', action: saveFile },
    ]},
    { label: "Edit", action: () => alert('notimpl') },
    { label: "View", items: [
        { label: 'Binary', action: () => editor.toggleView("bin") },
        { label: 'Hexadecimal', action: () => editor.toggleView("hex") },
        { label: 'ASCII', action: () => editor.toggleView("ascii") },
      ] },
    { label: "Window", action: () => alert('notimpl') },
  ]
});

const values = new ValuesExplorer(editor);
const strings = new Strings(editor);
const canvas = new Canvas(editor);

document.body.appendChild($.div({ id: "root" }, [
  menu,
  new Split({}, [
    new Split({}, [
      editor,
      new Split({}, [values, canvas]).setOrientation("vertical"),
    ]).setOrientation("horizontal"),
    strings,
  ]).setOrientation("vertical")
]));

addEventListener("beforeunload", (event) => {
  event.preventDefault();
});

import { $, bindAll } from "./dom.js";
import { HexEditor } from "./modules/editor.js";
import { ValuesExplorer } from "./modules/values-explorer.js";
import { Strings } from "./modules/strings.js";
import { Canvas } from "./modules/canvas.js";
import { MainMenu } from "./components/menu.js";
import { Tabs } from "./components/tabs.js";
import { DataBufferView } from "./structures/buffer-view.js";

const editor = new HexEditor(16);

function createFile() {
  const buffer = new DataBufferView(new Uint8Array(Array(16).fill(0)));
  editor.openFile(buffer);
}

function openFile(e) {
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
  if (!window.confirm(`Download file "${editor.fileName}"?`)) return;
  const blob = new Blob([editor.getBuffer()], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const link = $.a({ href: url, download: editor.fileName });
  document.body.appendChild(link);
  link.style = 'display: none';
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

const $file = $.input({ type: "file" });
bindAll($file, { change: openFile });

const windows = {
  "strings": { active: false, createWindow: (e) => new Strings(e) },
  "canvas": { active: false, createWindow: (e) => new Canvas(e) },
  "values-explorer": { active: false, createWindow: (e) => new ValuesExplorer(e) },
};

function toggleWindow(name) {
  if (!windows[name]) return;
  const cfg = windows[name];
  if (cfg.active) {
    cfg.window.destroy?.();
    cfg.window.$element.parentNode?.removeChild(this.$element);
    cfg.active = false;
    delete cfg.window;
  } else {
    cfg.window = cfg.createWindow(editor);
    document.querySelector(".tabs-container").appendChild(cfg.window.$element);
    cfg.active = true;
  }
}

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
    { label: "Window", items: [
        { label: 'Values explorer', action: () => toggleWindow("values-explorer") },
        { label: 'Strings', action: () => toggleWindow("strings") },
        { label: 'Canvas', action: () => toggleWindow("canvas") },
      ] },
  ]
});

document.body.appendChild($.div({ id: "root" }, [
  menu,
  new Tabs({}, [editor]),
]));

addEventListener("beforeunload", (event) => {
  event.preventDefault();
});

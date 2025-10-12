import { $, bindAll } from "./dom.js";
import { HexEditor } from "./modules/editor.js";
import { MainMenu } from "./components/menu.js";
import { DataBuffer } from "./structures/buffer.js";
import { Layout } from "./layout/layout.js";

const editor = new HexEditor(16);
const layout = new Layout(editor);

function createFile() {
  editor.openFile(new DataBuffer(16));
}

function openFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const fileReader = new FileReader();
  fileReader.onload = ({ target }) => {
    const buffer = new DataBuffer(target.result);
    editor.openFile(buffer, file.name);
  }
  fileReader.readAsArrayBuffer(file);
}

function saveFile() {
  if (!window.confirm(`Download file "${editor.fileName}"?`)) return;
  const blob = new Blob([editor.getBuffer()], { type: "application/octet-stream" });
  const url = window.URL.createObjectURL(blob);
  const link = $("a", { href: url, download: editor.fileName });
  document.body.appendChild(link);
  link.style = "display: none";
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

const $file = $("input", { type: "file" });
bindAll($file, { change: openFile });

const menu = new MainMenu();

document.body.appendChild($("div", { id: "root" }, [menu, layout]));
document.body.appendChild($("div", { id: "popover" }));

menu.setItems({
  items: [
    {
      label: "File", items: [
        { label: "New", action: createFile },
        { label: "Open", $element: $file },
        { label: "Save", action: saveFile },
      ]
    },
    {
      label: "View", items: [
        { label: "Binary", action: () => editor.toggleView("bin") },
        { label: "Hexadecimal", action: () => editor.toggleView("hex") },
        { label: "ASCII", action: () => editor.toggleView("ascii") },
      ]
    },
    {
      label: "Window", items: [
        { label: "Values explorer", action: () => layout.toggleWindow("hv-values-explorer") },
        { label: "Strings", action: () => layout.toggleWindow("hv-strings") },
        { label: "Canvas", action: () => layout.toggleWindow("hv-canvas") },
        { label: "Structures", action: () => layout.toggleWindow("hv-struct") },
        { type: "spacer" },
        { label: "Save layout", action: () => layout.save() },
      ]
    },
  ]
});

layout.restore();

addEventListener("beforeunload", (event) => {
  event.preventDefault();
});

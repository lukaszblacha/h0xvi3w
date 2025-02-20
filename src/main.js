import { $, bindAll } from "./dom.js";
import { HexEditor } from "./modules/editor.js";
import { MainMenu } from "./components/menu.js";
import { DataBufferView } from "./structures/buffer-view.js";
import { Layout } from "./layout.js";

const editor = new HexEditor(16);
const layout = new Layout(editor);

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

menu.setItems({
  items: [
    { label: "File", items: [
        { label: "New", action: createFile },
        { label: "Open", $element: $file },
        { label: "Save", action: saveFile },
      ]},
    // { label: "Edit", action: () => alert("notimpl") },
    { label: "View", items: [
        { label: "Binary", action: () => editor.toggleView("bin") },
        { label: "Hexadecimal", action: () => editor.toggleView("hex") },
        { label: "ASCII", action: () => editor.toggleView("ascii") },
      ] },
    { label: "Window", items: [
        { label: "Values explorer", action: () => layout.toggleWindow("hv-values-explorer") },
        { label: "Strings", action: () => layout.toggleWindow("hv-strings") },
        { label: "Canvas", action: () => layout.toggleWindow("hv-canvas") },
        { type: "spacer" },
        { label: "Save layout", action: () => layout.save() },
      ] },
  ]
});

layout.restore();

addEventListener("beforeunload", (event) => {
  event.preventDefault();
});

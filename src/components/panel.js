import { $ } from "../dom.js";

export const createPanel = (obj, { label, disposable }, { header, body, footer } = {}) => {
  obj.setAttribute("label", label);
  obj.setAttribute("disposable", disposable ? "true" : "false");
  obj.classList.add("panel");
  if (header) obj.appendChild($("div", { class: "panel-header" }, header));
  if (body) obj.appendChild($("div", { class: "panel-body" }, body));
  if (footer) obj.appendChild($("div", { class: "panel-footer" }, footer));
}

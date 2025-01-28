import { $div } from "../dom.js";

export const $split = (content) => {
  const $element = $div({ class: "vertical-split" }, content);

  return {
    setVertical: () => $element.className = "vertical-split",
    setHorizontal: () => $element.className = "horizontal-split",
    $element,
  }
}

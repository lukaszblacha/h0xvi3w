import { $div } from "../dom.js";

export const $split = (content) => {
  const $element = $div({ class: "vertical-split" }, content);

  const obj = { $element };

  const setClassName = (className) => {
    $element.className = className;
    return obj;
  }

  obj.setVertical = () => setClassName("vertical-split");
  obj.setHorizontal = () => setClassName("horizontal-split");

  return obj;
}

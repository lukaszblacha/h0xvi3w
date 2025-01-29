import { $div, cn } from "../dom.js";

export const $split = (attributes = {}, content) => {
  const $element = $div({ ...attributes, class: cn("vertical-split", attributes.class) }, content);

  const obj = { $element };

  const setClassName = (className) => {
    $element.classList.remove("horizontal-split");
    $element.classList.remove("vertical-split");
    $element.classList.add(className);
    return obj;
  }

  obj.setVertical = () => setClassName("vertical-split");
  obj.setHorizontal = () => setClassName("horizontal-split");

  return obj;
}

import { $, bindAll, cn } from "../dom.js";

export const $tabs = (attributes = {}, content) => {
  const $element = $.div({ ...attributes, class: cn("tabs", attributes.class) }, [
    $.ul({ class: "tabs-list" }),
    $.div({ class: "tabs-container" }, content),
  ]);

  const [$list, $container] = $element.querySelectorAll("& > *");
  let activeTabIndex = 0;

  function setActiveTabIndex(index) {
    if (index >= 0) {
      activeTabIndex = index;
      Array.from($list.children).map(($el, i) => {
        if(i === index) {
          $el.classList.add("active");
         } else {
          $el.classList.remove("active");
        }
      });
      Array.from($container.children).map(($el, i) => {
        if(i === index) {
          $el.classList.add("active-tab");
         } else {
          $el.classList.remove("active-tab");
        }
      });
    }
  }

  function onDomChange() {
    const labels = Array
      .from($container.children)
      .map(($el, i) => $el.getAttribute("label") || `Tab ${i}`);
    console.log(labels);
    $list.innerText = "";
    labels.map(label => $list.appendChild($.li({}, label)));
    window.$list = $list;
    setActiveTabIndex(activeTabIndex);
  }

  const observer = new MutationObserver(onDomChange);
  observer.observe($container, { childList: true });
  onDomChange();

  function onListItemClick({ target }) {
    if (target.tagName.toLowerCase() === "li") {
      setActiveTabIndex(Array.from(target.parentNode.childNodes).indexOf(target));
    }
  }
  bindAll($list, { click: onListItemClick });

  const obj = { $element, setActiveTabIndex };

  const setClassName = (className) => {
    $element.classList.remove("tabs-top");
    $element.classList.remove("tabs-bottom");
    $element.classList.add(className);
    return obj;
  }

  obj.setTop = () => setClassName("tabs-top");
  obj.setBottom = () => setClassName("tabs-bottom");

  return obj;
}

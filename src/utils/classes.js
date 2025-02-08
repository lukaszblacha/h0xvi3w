export function bindClassMethods(instance) {
  Object.entries(Object.getOwnPropertyDescriptors(instance.__proto__))
    .filter(([propName, descriptor]) =>
      !Object.hasOwnProperty.call(descriptor, "get") &&
      propName !== "constructor" &&
      typeof descriptor.value === "function"
    )
    .forEach(([propName, descriptor]) => instance[propName] = descriptor.value.bind(instance));
}

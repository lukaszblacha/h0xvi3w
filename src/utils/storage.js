export class HVStorage extends EventTarget {
  constructor(name, defaultValue) {
    super();
    this.name = name;
    this.defaultValue = defaultValue;
  }

  save(data) {
    const { name } = this;
    localStorage.setItem(name, JSON.stringify(data));
    this.dispatchEvent(
      new CustomEvent("change", { detail: { name, data } })
    );
  }

  load() {
    const { name } = this;
    try {
      return JSON.parse(localStorage.getItem(name)) || this.defaultValue;
    } catch {
      return this.defaultValue;
    }
  }
}

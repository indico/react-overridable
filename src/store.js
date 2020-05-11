/**
 * Simple utility class responsible of keeping track of all overridden components.
 * @constructor object containing the initial map `id: Component` of overridden components
 */
class OverriddenCmpsRepository {
  constructor(overriddenCmps) {
    this.components = overriddenCmps || {};
  }

  add = (id, Component) => {
    this.components[id] = Component;
  };

  get = id => {
    return this.components[id];
  };

  getAll = () => {
    return {...this.components};
  };

  clear = () => {
    this.components = {};
  };
}

export const overrideStore = new OverriddenCmpsRepository();

/**
 * Simple utility class responsible of keeping track of all overridden components.
 * @constructor object containing the initial map `id: Component` of overridden components
 */
export class OverriddenComponentRepository {
  constructor(overriddenComponents) {
    this.components = overriddenComponents || {};
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

export const overrideStore = new OverriddenComponentRepository();

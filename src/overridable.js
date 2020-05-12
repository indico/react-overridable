import React, {useContext} from 'react';
import PropTypes from 'prop-types';

// create a new context with an empty map of overridden components as default value.
export const OverridableContext = React.createContext({});

/**
 * Function to wrap a React component and override default props.
 * @param Component the component to wrap
 * @param extraProps the new props that will override or will be added to the wrapped component
 * @returns the wrapper component
 */
export function parametrize(Component, extraProps) {
  const ParametrizedComponent = props => {
    // handle deferred prop calculation
    if (typeof extraProps === 'function') {
      extraProps = extraProps(props);
    }

    // Store the original component in an attribute
    if (Component.originalComponent) {
      Component = Component.originalComponent;
    }

    // overrideProps override props if there is a name collision
    const {children, ...attrProps} = {...props, ...extraProps};
    return React.createElement(Component, attrProps, children);
  };

  const name = Component.displayName || Component.name;
  ParametrizedComponent.displayName = `Parametrized(${name})`;
  return ParametrizedComponent;
}

/**
 * React component to enable overriding children when rendering.
 */
function Overridable({id, children, ...restProps}) {
  const overriddenComponents = useContext(OverridableContext);
  const child = children ? React.Children.only(children) : null; // throws an error if multiple children
  const childProps = child ? child.props : {};

  const hasOverriddenComponent = id in overriddenComponents;
  if (hasOverriddenComponent) {
    // If there's an override, we replace the component's content with
    // the override + props
    const Overridden = overriddenComponents[id];
    return React.createElement(Overridden, {...childProps, ...restProps});
  } else if (child) {
    // No override? Clone the Overridable component's original children
    return React.cloneElement(child, childProps);
  } else {
    return null;
  }
}

Overridable.propTypes = {
  /** The children of the component */
  children: PropTypes.node,
  /** The id that the component will be bound to (normally component's name) */
  id: PropTypes.string,
};

Overridable.defaultProps = {
  id: null,
  children: null,
};

/**
 * High-order component to override an existing React component and provide a new component instead.
 */
Overridable.component = (id, Component) => {
  const Overridden = ({children, ...props}) => {
    const overriddenComponents = useContext(OverridableContext);
    const overriddenComponent = overriddenComponents[id];
    return React.createElement(overriddenComponent || Component, props, children);
  };
  Overridden.propTypes = {
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  };
  Overridden.defaultProps = {
    children: null,
  };
  const name = Component.displayName || Component.name;
  Overridden.displayName = `Overridable(${name})`;
  Overridden.originalComponent = Component;
  return Overridden;
};

export default Overridable;

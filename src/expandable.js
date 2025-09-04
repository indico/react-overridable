import React, {useContext} from 'react';
import PropTypes from 'prop-types';
import {DevModeWrapper} from './dev';

export const ExpandableContext = React.createContext({});

/**
 * React component to enable overriding children when rendering.
 */
function Expandable({id, children, ...restProps}) {
  const expandedComponents = useContext(ExpandableContext);
  const child = children ? React.Children.only(children) : null;
  const childProps = child ? child.props : {};

  if (id in expandedComponents) {
    const overrides = expandedComponents[id];
    const elements = overrides.map((overridden, i) =>
      React.createElement(overridden, {...childProps, ...restProps, key: `${id}-${i}`})
    );
    return <DevModeWrapper id={id}>{elements}</DevModeWrapper>;
  } else if (child) {
    // No override? Clone the Expandable component's original children
    const element = React.cloneElement(child, childProps);
    return <DevModeWrapper id={id}>{element}</DevModeWrapper>;
  } else {
    return null;
  }
}

Expandable.propTypes = {
  /** The children of the component */
  children: PropTypes.node,
  /** The id that the component will be bound to (normally component's name) */
  id: PropTypes.string,
};

Expandable.defaultProps = {
  id: null,
  children: null,
};

/**
 * High-order component to override an existing React component and provide a new component instead.
 */
Expandable.component = (id, Component) => {
  const Expanded = ({children, ...props}) => {
    const expandedComponents = useContext(ExpandableContext);
    const expandedComponent = expandedComponents[id];
    return React.createElement(expandedComponent || Component, props, children);
  };
  Expanded.propTypes = {
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  };
  Expanded.defaultProps = {
    children: null,
  };
  const name = Component.displayName || Component.name;
  Expanded.displayName = `Expandable(${name})`;
  Expanded.originalComponent = Component;
  return Expanded;
};

export default Expandable;

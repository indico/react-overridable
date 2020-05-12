# react-overridable

With `react-overridable` you can mark your React components as overridable
and allow other apps to customize them. This can be useful when creating
libraries with a default implementation of components which requires to be
overridden at runtime.

You can inject new props, override render elements or the component itself.

## Usage

Create a React component and mark it as overridable:

```js
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import Overridable, {parametrize, OverridableContext} from 'react-overridable';

class TitleComponent extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  };

  static defaultProps = {
    children: null,
  };

  render() {
    const {title, children} = this.props;
    return (
      <Overridable id="TitleComponent.container" title={title}>
        <>
          <div>{title}</div>
          {children}
        </>
      </Overridable>
    );
  }
}

export const OverridableExampleComponent = Overridable.component('TitleComponent', TitleComponent);
```

In this example, the `TitleComponent` is marked as overridable inside the
`render` function, via the React component `<Overridable />` and then exported
via the Higher-Order component `Overridable.component`.
Each overridable component is identified by a unique id.

After marking components as overridable, there are 3 ways that you can use to override:

1. **Provide new props with `parametrize`**: define new props to override the default component props.
```js
const parametrized = parametrize(OverridableExampleComponent, {
  title: 'My new title',
});
// create a map {<component id>: <parametrized props>}
const overriddenComponents = {TitleComponent: parametrized};
```

2. **Provide new render elements**: override the default rendered elements for the marked sections.
Props are passed and can be used in the new template.
```js
const overriddenRenderElement = ({title}) => (
  <h1>{title}</h1>
);
// create a map {<render element id>: <new render elements>}
const overriddenComponents = {TitleComponent.container: overriddenRenderElement};
```

3. **Provide a new component**: you can replace the existing component with a new one.
```js
const NewComponent = () => <strong>This is a new title</strong>;
// create a map {<component id>: <new component>}
const overriddenComponents = {TitleComponent: NewComponent};
```

In your app, inject the map of ids-components in the React Context
`OverridableContext` so that the `react-overridable` library can
use it and replace components when the default are rendered:
```js
class App extends Component {
  render() {
    return (
      <OverridableContext.Provider value={overriddenComponents}>
        <....>
      </OverridableContext.Provider>
    )
  }
}
```

## Install

To install the library, you will have to install the peer dependencies.
```
npm i react-overridable
npm i <peer dependencies>
```

## Development

To run tests:
```
npm run test
```

To build the library:
```
npm run build
```

## Note

In applying the MIT license, CERN does not waive the privileges and immunities
granted to it by virtue of its status as an Intergovernmental Organization
or submit itself to any jurisdiction.

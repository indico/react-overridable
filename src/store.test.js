import {mount} from 'enzyme';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import Overridable, {OverridableContext, overrideStore} from '.'; // export from index.js to test it

class ExampleComponent extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  };

  render() {
    const {title, children = null} = this.props;
    return (
      <>
        <h1>{title}</h1>
        {children}
      </>
    );
  }
}

const CMP_ID = 'ExampleComponent';
const OverridableExampleComponent = Overridable.component(CMP_ID, ExampleComponent);

describe('Tests for store utility object.', () => {
  beforeEach(() => {
    overrideStore.clear();
  });

  test('it should render the cmp added to the global store instead of default cmp with id `ExampleComponent`', () => {
    const NewComponent = () => <h2>Stored in the global store</h2>;
    overrideStore.add(CMP_ID, NewComponent);

    const mounted = mount(
      <OverridableContext.Provider value={overrideStore.getAll()}>
        <OverridableExampleComponent title="Ignored title" color="red">
          <ul>
            <li>It should NOT appear!</li>
          </ul>
        </OverridableExampleComponent>
      </OverridableContext.Provider>
    );

    const NewCmp = mounted.childAt(0);
    expect(NewCmp.prop('title')).toEqual('Ignored title');
    expect(NewCmp.prop('color')).toEqual('red');

    const h2 = NewCmp.find('h2');
    expect(h2).toHaveLength(1);
    expect(h2.prop('children')).toEqual('Stored in the global store');

    expect(NewCmp.find('ul')).toHaveLength(0);
  });
});

describe('React 18 StrictMode compatibility', () => {
  beforeEach(() => {
    overrideStore.clear();
  });

  test('global store works with StrictMode double-mount', () => {
    const NewComponent = () => <h2>StrictMode Test</h2>;
    overrideStore.add(CMP_ID, NewComponent);

    const mounted = mount(
      <React.StrictMode>
        <OverridableContext.Provider value={overrideStore.getAll()}>
          <OverridableExampleComponent title="Test" />
        </OverridableContext.Provider>
      </React.StrictMode>
    );

    // Verify override is correctly applied despite double-mount
    const h2 = mounted.find('h2');
    expect(h2).toHaveLength(1);
    expect(h2.prop('children')).toEqual('StrictMode Test');
  });
});

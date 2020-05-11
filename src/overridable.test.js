import {mount} from 'enzyme';
import PropTypes from 'prop-types';
import React, {Component} from 'react';
import Overridable, {parametrize, OverridableContext} from '.'; // export from index.js to test it

class ExampleComponent extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    color: PropTypes.oneOf(['blue', 'green', 'red']),
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  };

  static defaultProps = {
    color: 'blue',
    children: null,
  };

  render() {
    const {title, color, children} = this.props;
    return (
      <Overridable id="ExampleComponent.container" cmpTitle={title} cmpColor={color}>
        <>
          <div style={{color}}>{title}</div>
          {children}
        </>
      </Overridable>
    );
  }
}

const OverridableExampleComponent = Overridable.component('ExampleComponent', ExampleComponent);

const assertTitleStyle = (element, title, style) => {
  expect(
    element.filterWhere(el => {
      const styleAttr = el.prop('style');
      // simple obj comparison for equality
      const sameStyle = JSON.stringify(styleAttr) === JSON.stringify(style);
      return el.prop('children') === title && sameStyle;
    })
  ).toHaveLength(1);
};

describe('Tests for default cmp behaviour', () => {
  test('it should render the default cmp with default props and passed children', () => {
    const Cmp = mount(
      <OverridableExampleComponent title="TODOs">
        <p>
          <span>First TODO</span>
          <span>Second TODO</span>
        </p>
      </OverridableExampleComponent>
    );

    assertTitleStyle(Cmp.find('div'), 'TODOs', {color: 'blue'});

    const children = Cmp.find('p').children();
    expect(children).toHaveLength(2);
    expect(children.get(0)).toEqual(<span>First TODO</span>);
    expect(children.get(1)).toEqual(<span>Second TODO</span>);
  });

  test('it should render the default component with passed props and no children', () => {
    const Cmp = mount(<OverridableExampleComponent title="TODOs" color="green" />);

    assertTitleStyle(Cmp.find('div'), 'TODOs', {color: 'green'});

    const children = Cmp.find('p').children();
    expect(children).toHaveLength(0);
  });
});

describe('Tests for parametrized', () => {
  /**
   * With using parametrize, the final component will be rendered:
   *
   * <Overridable(ExampleComponent) title="TODOs">
   *  <Parametrized(Overridable(ExampleComponent)) title="TODOs">
   *    <ExampleComponent title="New title" color="red">
   */
  test('it should render the cmp with id `ExampleComponent` with new props', () => {
    const parametrized = parametrize(OverridableExampleComponent, {
      title: 'New title',
      color: 'red',
    });
    const overriddenCmps = {ExampleComponent: parametrized};

    const mounted = mount(
      <OverridableContext.Provider value={overriddenCmps}>
        <OverridableExampleComponent title="TODOs">
          <p>This should be rendered</p>
        </OverridableExampleComponent>
      </OverridableContext.Provider>
    );

    const ParametrizedCmp = mounted.childAt(0);
    expect(ParametrizedCmp.name()).toEqual('Parametrized(Overridable(ExampleComponent))');

    const ExampleCmp = ParametrizedCmp.childAt(0);
    expect(ExampleCmp.prop('title')).toEqual('New title');
    expect(ExampleCmp.prop('color')).toEqual('red');

    assertTitleStyle(ExampleCmp.find('div'), 'New title', {color: 'red'});

    const children = ExampleCmp.find('p').children();
    expect(children).toHaveLength(1);
  });

  test('it should render the cmp with id `ExampleComponent` with new props passed as function', () => {
    const parametrized = parametrize(OverridableExampleComponent, ({title, ...props}) => ({
      title: `Other ${title}`,
      ...props,
    }));
    const overriddenCmps = {ExampleComponent: parametrized};

    const mounted = mount(
      <OverridableContext.Provider value={overriddenCmps}>
        <OverridableExampleComponent title="TODOs">
          <p>This should be rendered</p>
        </OverridableExampleComponent>
      </OverridableContext.Provider>
    );

    const ExampleCmp = mounted.childAt(0).childAt(0);
    assertTitleStyle(ExampleCmp.find('div'), 'Other TODOs', {color: 'blue'});

    const children = ExampleCmp.find('p').children();
    expect(children).toHaveLength(1);
  });
});

describe('Tests for Overridable render elements', () => {
  /**
   * When overriding render elements with Overridable, the final component will be rendered:
   *
   * <Overridable(ExampleComponent) title="My TODOs" color="red">
   *  <ExampleComponent title="My TODOs" color="red">
   *    <Overridable id="ExampleComponent.container" cmpTitle="My TODOs" cmpColor="red">
   *      <NewCmp cmpTitle="My TODOs" cmpColor="red">
   */
  test('it should render the cmp with id `ExampleComponent.container` with the overridden render elements', () => {
    // eslint-disable-next-line react/prop-types
    const overriddenRenderElement = ({cmpTitle, cmpColor}) => (
      <h1 style={{cmpColor}}>{cmpTitle}</h1>
    );
    const overriddenCmps = {'ExampleComponent.container': overriddenRenderElement};

    const mounted = mount(
      <OverridableContext.Provider value={overriddenCmps}>
        <OverridableExampleComponent title="My TODOs" color="red">
          <ul>
            <li>It should NOT appear!</li>
          </ul>
        </OverridableExampleComponent>
      </OverridableContext.Provider>
    );

    const ExampleCmp = mounted.childAt(0);
    expect(ExampleCmp.prop('title')).toEqual('My TODOs');
    expect(ExampleCmp.prop('color')).toEqual('red');

    assertTitleStyle(ExampleCmp.find('h1'), 'My TODOs', {cmpColor: 'red'});
    expect(ExampleCmp.find('ul')).toHaveLength(0);
  });

  test('it should throw when the overridden cmp with id `ExampleComponent` contains multiple children', () => {
    const WrongComponent = () => (
      <Overridable id="WrongComponent.container">
        <div>Title</div>
        <span>Content</span>
      </Overridable>
    );
    expect(() => mount(WrongComponent)).toThrow();
  });
});

describe('Tests for Overridable.component', () => {
  /**
   * When overriding template with Overridable, the final component will be rendered:
   *
   *  <Overridable(ExampleComponent) title="Ignored title" color="red">
   *   <NewCmp title="Ignored title" color="red">
   */
  test('it should render the passed cmp instead of default cmp with id `ExampleComponent`', () => {
    const NewComponent = () => <h3>Hardcoded TODOs title</h3>;
    const overriddenCmps = {ExampleComponent: NewComponent};

    const mounted = mount(
      <OverridableContext.Provider value={overriddenCmps}>
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

    const h3 = NewCmp.find('h3');
    expect(h3).toHaveLength(1);
    expect(h3.prop('children')).toEqual('Hardcoded TODOs title');

    expect(NewCmp.find('ul')).toHaveLength(0);
  });
});

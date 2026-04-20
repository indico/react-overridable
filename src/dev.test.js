import {mount} from 'enzyme';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {startDevMode, useDevMode, DevModeWrapper} from './dev';

// Shared event listener mocks
const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

const eventName = 'ReactOverridableDevMode';

function setupWindowEventListenerMocks() {
  const addedListeners = [];
  const removedListeners = [];

  window.addEventListener = jest.fn((event, handler) => {
    if (event === eventName) {
      addedListeners.push(handler);
    }
    return originalAddEventListener.call(window, event, handler);
  });

  window.removeEventListener = jest.fn((event, handler) => {
    if (event === eventName) {
      removedListeners.push(handler);
    }
    return originalRemoveEventListener.call(window, event, handler);
  });

  return {addedListeners, removedListeners};
}

function restoreEventListenerMocks() {
  window.addEventListener = originalAddEventListener;
  window.removeEventListener = originalRemoveEventListener;
}

describe('Tests for dev module start dev mode function', () => {
  test('it should expose reactOverridableEnableDevMode function to window', () => {
    expect(window.reactOverridableEnableDevMode).toBeDefined();
    expect(typeof window.reactOverridableEnableDevMode).toBe('function');
  });

  test('it should start dev mode when reactOverridableEnableDevMode gets called', () => {
    const eventListener = jest.fn();
    window.addEventListener(eventName, eventListener);

    act(() => {
      startDevMode();
    });

    expect(eventListener).toHaveBeenCalled();
    expect(window._ReactOverridableIsDevMode).toBe(true);

    window.removeEventListener(eventName, eventListener);
  });
});

describe('Tests for useDevMode hook', () => {
  test('it should return false when dev mode is not active', () => {
    // Resets dev mode state
    delete window._ReactOverridableIsDevMode;

    const TestComponent = () => {
      const isDevMode = useDevMode();
      return <div>{isDevMode ? 'DEV' : 'USER'}</div>;
    };

    const wrapper = mount(<TestComponent />);
    expect(wrapper.text()).toBe('USER');
  });

  test('it should return true when dev mode is active', () => {
    act(() => {
      startDevMode();
    });

    const TestComponent = () => {
      const isDevMode = useDevMode();
      return <div>{isDevMode ? 'DEV' : 'USER'}</div>;
    };

    const wrapper = mount(<TestComponent />);
    expect(wrapper.text()).toBe('DEV');
  });

  test('it should register & clean up ReactOverridableDevMode event listener', () => {
    delete window._ReactOverridableIsDevMode;

    const {addedListeners, removedListeners} = setupWindowEventListenerMocks();

    const TestComponent = () => {
      const isDevMode = useDevMode();
      return <div>{isDevMode ? 'DEV' : 'USER'}</div>;
    };

    const wrapper = mount(<TestComponent />);

    // Verify listener was added
    expect(addedListeners.length).toBe(1);

    // Unmount component
    wrapper.unmount();

    // Verify the same listener was removed (cleanup function called)
    expect(removedListeners.length).toBe(1);
    expect(removedListeners[0]).toBe(addedListeners[0]);

    restoreEventListenerMocks();
  });
});

describe('Tests for DevModeWrapper', () => {
  test('should render children when not in dev mode', () => {
    // Resets dev mode state
    delete window._ReactOverridableIsDevMode;

    const wrapper = mount(
      <DevModeWrapper id="ExampleComponent.container">
        <div className="test-content">Test Content</div>
      </DevModeWrapper>
    );

    expect(wrapper.find('.test-content')).toHaveLength(1);
    expect(wrapper.text()).toContain('Test Content');
  });

  test('should render with multiple children', () => {
    const wrapper = mount(
      <DevModeWrapper id="ExampleComponent.container">
        <span className="first">First</span>
        <span className="second">Second</span>
      </DevModeWrapper>
    );

    expect(wrapper.find('.first')).toHaveLength(1);
    expect(wrapper.find('.second')).toHaveLength(1);
  });

  test('should not wrap children in extra DOM elements when not in dev mode', () => {
    // Resets dev mode state
    delete window._ReactOverridableIsDevMode;

    const wrapper = mount(
      <DevModeWrapper id="ExampleComponent.container">
        <div className="child">Content</div>
      </DevModeWrapper>
    );

    const children = wrapper.children();
    expect(children).toHaveLength(1);
    expect(children.get(0)).toEqual(<div className="child">Content</div>);
  });

  test('should create overlay div when rendered', () => {
    mount(
      <DevModeWrapper id="ExampleComponent.container">
        <span>Content</span>
      </DevModeWrapper>
    );

    // There should now be a single div appended to body as _overlayRoot.
    const bodyDivs = document.body.querySelectorAll(':scope > div');
    expect(bodyDivs.length).toEqual(1);
  });

  test('should insert span anchor when dev mode is active', () => {
    act(() => {
      startDevMode();
    });

    const wrapper = mount(
      <DevModeWrapper id="ExampleComponent.container">
        <div className="child">Content</div>
      </DevModeWrapper>
    );

    const html = wrapper.html();
    // Verify span appears before the the normal chilren
    const spanIndex = html.indexOf('<span></span>');
    const childIndex = html.indexOf('<div class="child">Content</div>');
    expect(spanIndex).toBeGreaterThanOrEqual(0);
    expect(childIndex).toBeGreaterThanOrEqual(0);
    expect(spanIndex).toBeLessThan(childIndex);
  });

  test('should not re-render children when dev mode is activated', () => {
    let renderCount = 0;

    const ChildComponent = () => {
      renderCount++;
      return <div className="child">Content</div>;
    };

    const wrapper = mount(
      <DevModeWrapper id="ExampleComponent.container">
        <ChildComponent />
      </DevModeWrapper>
    );

    const initialRenderCount = renderCount;

    act(() => {
      startDevMode();
    });

    // Force update to trigger re-render
    wrapper.update();

    // Verify child wasn't re-rendered unnecessarily
    expect(renderCount).toBe(initialRenderCount);
  });
});

import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import PropTypes from 'prop-types';

const event = 'ReactOverridableDevMode';

export function startDevMode() {
  window.dispatchEvent(new Event(event));
  window._ReactOverridableIsDevMode = true;
}

/**
 * A globally exposed function. When called, this activates the developer mode for React Overridable.
 * All overridable components will show their IDs when the mouse is hovered over their parent container.
 */
window.reactOverridableEnableDevMode = startDevMode;

/**
 * Returns true if dev mode is active, false otherwise.
 */
export function useDevMode() {
  const [isDevMode, setDevMode] = useState(window._ReactOverridableIsDevMode ?? false);

  useEffect(() => {
    const eventHandler = () => {
      setDevMode(true);
    };
    window.addEventListener(event, eventHandler);
    return () => {
      window.removeEventListener(event, eventHandler);
    };
  }, []);

  return isDevMode;
}

let _overlayRoot = null;
/**
 * In order to avoid a full re-render of the component when devmode gets activated (which can cause bugs in older components with complex side-effects)
 * we use a top-level div overlay and display the ID tags as absolute-positioned elements located at the location of the relevant overridable.
 *
 * This function creates this overlay if it has not yet been created and returns a reference to it.
 */
function useOverlayRoot() {
  useEffect(() => {
    if (!_overlayRoot) {
      _overlayRoot = document.createElement('div');
      document.body.appendChild(_overlayRoot);
    }
  }, []);

  return _overlayRoot;
}

/**
 * Renders the child (i.e. the default component or the override) as normal, ensuring there are no modifications to the DOM whatsoever
 * when dev mode is not active. This means regular rendering of the component is unaffected.
 *
 * When dev mode gets activated, we also ensure a full re-render does not happen (e.g. wrapping the component in a new div). Instead,
 * we insert a <span> just before the child which acts as a location anchor. We use this to calculate where to show the absolute-positioned
 * ID tag in the top-level overlay.
 */
export function DevModeWrapper({id, children}) {
  const isDevMode = useDevMode();
  const overlayRoot = useOverlayRoot();
  const ref = useRef();

  return (
    <>
      {isDevMode && (
        <>
          <span ref={ref} />
          {createPortal(<IDTag id={id} targetRef={ref} />, overlayRoot)}
        </>
      )}

      {children}
    </>
  );
}

DevModeWrapper.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function IDTag({targetRef, id}) {
  const [position, setPosition] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;
    const parent = node.parentElement;

    /**
     * Only show the ID tag if the element's parents is hovered. We can't get a direct reference to the DOM element itself
     * because we can't rely on all user-implemented overridable components to accept a `ref` prop.
     */
    const mouseEventHandler = e => {
      setShow(parent.contains(e.target));
    };

    let frameId, lastPosition;
    const animationFrameHandler = () => {
      const rect = node.getBoundingClientRect();

      const newPosition = {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      };

      const hasChanged =
        !lastPosition ||
        lastPosition.top !== newPosition.top ||
        lastPosition.left !== newPosition.left;

      if (hasChanged) {
        setPosition(newPosition);
      }

      // Poll this function constantly without affecting UI performance
      frameId = requestAnimationFrame(animationFrameHandler);
    };

    animationFrameHandler();
    document.addEventListener('mousemove', mouseEventHandler);

    return () => {
      document.removeEventListener('mousemove', mouseEventHandler);
      cancelAnimationFrame(frameId);
    };
  }, [targetRef]);

  if (!position || !show) return null;

  return (
    <p
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        background: 'darkred',
        color: 'white',
        fontSize: '10px',
        zIndex: 9999,
        pointerEvents: 'none',
        padding: '2px 4px',
        borderRadius: '4px',
        border: '1px solid white',
        fontWeight: 'bold',
      }}
    >
      {id}
    </p>
  );
}

IDTag.propTypes = {
  id: PropTypes.string.isRequired,
  targetRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}).isRequired,
};

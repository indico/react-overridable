import React, {useCallback, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import PropTypes from 'prop-types';

const event = 'ReactOverridableDevMode';

export function startDevMode() {
  window.dispatchEvent(new Event(event));
  window._ReactOverridableIsDevMode = true;
}

/**
 * A globally exposed function. When called, this activates the developer mode for
 * React Overridable.
 * All overridable components will show their IDs in a small overlay tag until the next page reload.
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
 * In order to avoid a full re-render of the component when devmode gets activated
 * (which can cause bugs in older components with complex side-effects) we use a top-level
 * div overlay and display the ID tags as absolute-positioned elements located at the location
 * of the relevant overridable.
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
 * Renders the child (i.e. the default component or the override) as normal, ensuring
 * there are no modifications to the DOM whatsoever when dev mode is not active.
 * This means regular rendering of the component is unaffected.
 *
 * When dev mode gets activated, we also ensure a full re-render does not happen
 * (e.g. wrapping the component in a new div). Instead, we insert a <span> just
 * before the child which acts as a location anchor. We use this to calculate where to
 * show the absolute-positioned ID tag in the top-level overlay.
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

let tagPositions = [];
// To avoid having to integrate precise size measuring (which depends on OS, browser, font, etc),
// we just make some reasonable assumptions and create a bounding box of this size.
const presumedHeight = 25;
const presumedWidth = 400;

function storeTagPosition(id, top, left) {
  const index = tagPositions.findIndex(t => t.id === id);
  const position = {
    id,
    top,
    left,
    bottom: top + presumedHeight,
    right: left + presumedWidth,
  };

  if (index === -1) {
    tagPositions.push(position);
  } else {
    tagPositions[index] = position;
  }
}

function removeTagPosition(id) {
  tagPositions = tagPositions.filter(t => t.id !== id);
}

// Returns true if the proposed location (with the height/width presumptions) would overlap
// with another tag for a different ID.
function overlapExists(id, refTop, refLeft) {
  const provisionalBottom = refTop + presumedHeight;
  const provisionalRight = refLeft + presumedWidth;

  return tagPositions.some(t => {
    if (t.id === id) {
      return false;
    }
    if (provisionalRight < t.left || t.right < refLeft) {
      return false;
    }
    if (provisionalBottom < t.top || t.bottom < refTop) {
      return false;
    }
    return true;
  });
}

function getNewPosition(id, refTop, refLeft) {
  let top = refTop;
  while (overlapExists(id, top, refLeft)) {
    // Keep moving the tag location downwards until we no longer have an overlap.
    top++;
  }

  return {top, left: refLeft};
}

function IDTag({targetRef, id}) {
  const [position, setPosition] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const node = targetRef.current;
    if (!node) return;

    let frameId;
    const animationFrameHandler = () => {
      const rect = node.getBoundingClientRect();
      const parentRect = node.parentElement.getBoundingClientRect();

      if (parentRect.width === 0 || parentRect.height === 0) {
        // If width/height is 0 then the element is not visible so we should avoid showing the tag.
        setPosition(null);
      } else {
        const newPosition = getNewPosition(
          id,
          rect.top + window.scrollY,
          rect.left + window.scrollX
        );
        storeTagPosition(id, newPosition.top, newPosition.left);
        setPosition(newPosition);
      }

      // Poll this function constantly without affecting UI performance
      frameId = requestAnimationFrame(animationFrameHandler);
    };

    animationFrameHandler();

    return () => {
      removeTagPosition(id);
      cancelAnimationFrame(frameId);
    };
  }, [targetRef, id]);

  const onClick = useCallback(async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  }, [id]);

  if (!position) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        background: 'darkred',
        color: 'white',
        fontSize: '10px',
        zIndex: 9999,
        padding: '2px 4px',
        borderRadius: '4px',
        border: '1px solid white',
        fontWeight: 'bold',
        cursor: 'pointer',
      }}
    >
      {copied ? 'Copied!' : id}
    </button>
  );
}

IDTag.propTypes = {
  id: PropTypes.string.isRequired,
  targetRef: PropTypes.shape({current: PropTypes.instanceOf(Element)}).isRequired,
};

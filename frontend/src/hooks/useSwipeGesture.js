import { useRef, useCallback } from 'react';

/**
 * useSwipeGesture Hook
 * 
 * Detects horizontal and vertical swipe gestures on touch devices.
 * Used for opening/closing sidebar with swipe right/left, and for
 * pull-to-refresh with swipe down.
 * 
 * @param {Object} options
 * @param {Function} options.onSwipeLeft - Called when swiping left
 * @param {Function} options.onSwipeRight - Called when swiping right
 * @param {Function} options.onSwipeUp - Called when swiping up
 * @param {Function} options.onSwipeDown - Called when swiping down
 * @param {number} options.threshold - Minimum distance in px to trigger (default: 50)
 * @param {number} options.velocityThreshold - Minimum velocity in px/ms (default: 0.3)
 * @param {boolean} options.disabled - Disable gesture detection
 * 
 * @example
 * const swipeHandlers = useSwipeGesture({
 *   onSwipeRight: () => setSidebarOpen(true),
 *   onSwipeLeft: () => setSidebarOpen(false),
 *   threshold: 50,
 * });
 * 
 * <div {...swipeHandlers}>Content</div>
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  velocityThreshold = 0.3,
  disabled = false,
} = {}) {
  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const touchEnd = useRef({ x: 0, y: 0, time: 0 });
  const isSwiping = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = { ...touchStart.current };
    isSwiping.current = true;
  }, [disabled]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || !isSwiping.current) return;
    const touch = e.touches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || !isSwiping.current) return;
    isSwiping.current = false;

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;
    const velocity = Math.abs(deltaX) / deltaTime;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if swipe is horizontal or vertical
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold || velocity > velocityThreshold) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold || velocity > velocityThreshold) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
  }, [disabled, threshold, velocityThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}

/**
 * useSidebarSwipe Hook
 * 
 * Specifically for sidebar swipe open/close gestures.
 * Swiping from the left edge opens the sidebar; swiping left closes it.
 * 
 * @param {boolean} sidebarOpen - Current sidebar state
 * @param {Function} setSidebarOpen - State setter for sidebar
 * @param {Object} options - Additional options
 */
export function useSidebarSwipe(sidebarOpen, setSidebarOpen, options = {}) {
  const { edgeWidth = 30, disabled = false } = options;
  const edgeSwipeStart = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    const touch = e.touches[0];
    // Only start tracking if touch is near the left edge or sidebar is open
    if (touch.clientX < edgeWidth || sidebarOpen) {
      edgeSwipeStart.current = touch.clientX;
    }
  }, [disabled, edgeWidth, sidebarOpen]);

  const handleTouchEnd = useCallback((e) => {
    if (disabled || edgeSwipeStart.current === null) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - edgeSwipeStart.current;
    edgeSwipeStart.current = null;

    if (deltaX > 50 && !sidebarOpen) {
      // Swipe right from edge → open sidebar
      setSidebarOpen(true);
    } else if (deltaX < -50 && sidebarOpen) {
      // Swipe left → close sidebar
      setSidebarOpen(false);
    }
  }, [disabled, sidebarOpen, setSidebarOpen]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
  };
}

export default useSwipeGesture;

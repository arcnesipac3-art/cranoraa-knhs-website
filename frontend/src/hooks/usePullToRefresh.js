import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * usePullToRefresh Hook
 * 
 * Implements pull-to-refresh gesture for mobile devices.
 * User pulls down from the top of a scrollable container to trigger a refresh.
 * 
 * @param {Function} onRefresh - Async function called when pull threshold is met
 * @param {Object} options
 * @param {number} options.threshold - Pull distance to trigger refresh (default: 80)
 * @param {number} options.maxPull - Maximum pull distance (default: 120)
 * @param {number} options.resistance - Pull resistance factor (default: 2.5)
 * @param {boolean} options.disabled - Disable pull-to-refresh
 * @param {string} options.containerSelector - CSS selector for scrollable container
 * 
 * @example
 * const { isRefreshing, pullDistance, handlers, indicatorProps } = usePullToRefresh({
 *   onRefresh: async () => { await refetchData(); },
 * });
 * 
 * <div className="relative" {...handlers}>
 *   {isRefreshing && <PullIndicator {...indicatorProps} />}
 *   <div>Page content</div>
 * </div>
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  resistance = 2.5,
  disabled = false,
  containerSelector = null,
} = {}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullDirection, setPullDirection] = useState(null); // 'down' | 'up' | null

  const touchStart = useRef({ y: 0, x: 0, time: 0 });
  const isPulling = useRef(false);
  const canPull = useRef(false);
  const containerRef = useRef(null);

  // Find the scrollable container
  useEffect(() => {
    if (containerSelector) {
      containerRef.current = document.querySelector(containerSelector);
    }
  }, [containerSelector]);

  const isAtTop = useCallback(() => {
    if (containerRef.current) {
      return containerRef.current.scrollTop <= 0;
    }
    return window.scrollY <= 0 || document.documentElement.scrollTop <= 0;
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return;
    
    const touch = e.touches[0];
    touchStart.current = {
      y: touch.clientY,
      x: touch.clientX,
      time: Date.now(),
    };
    
    canPull.current = isAtTop();
    isPulling.current = false;
    setPullDirection(null);
  }, [disabled, isRefreshing, isAtTop]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || isRefreshing || !canPull.current) return;

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaX = Math.abs(touch.clientX - touchStart.current.x);

    // Only activate for vertical downward pull (ignore horizontal scrolling)
    if (deltaX > 30) return;

    if (deltaY > 0) {
      isPulling.current = true;
      setPullDirection('down');
      
      // Apply resistance to make pull feel natural
      const resistedDistance = Math.min(deltaY / resistance, maxPull);
      setPullDistance(resistedDistance);

      // Prevent default scroll behavior while pulling
      if (resistedDistance > 10) {
        e.preventDefault();
      }
    }
  }, [disabled, isRefreshing, resistance, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isPulling.current) {
      setPullDistance(0);
      setPullDirection(null);
      return;
    }

    isPulling.current = false;

    if (pullDistance >= threshold / resistance && onRefresh) {
      // Trigger refresh
      setPullDistance(threshold / resistance * 0.6);
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (err) {
        console.error('Pull-to-refresh failed:', err);
      } finally {
        setIsRefreshing(false);
      }
    }

    // Reset pull distance with animation
    setPullDistance(0);
    setPullDirection(null);
  }, [disabled, pullDistance, threshold, resistance, onRefresh]);

  // Calculate indicator props
  const indicatorProps = {
    pullDistance,
    isRefreshing,
    threshold: threshold / resistance,
    progress: Math.min(pullDistance / (threshold / resistance), 1),
    direction: pullDirection,
  };

  return {
    isRefreshing,
    pullDistance,
    pullDirection,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    indicatorProps,
  };
}

/**
 * PullIndicator Component
 * 
 * Visual indicator for pull-to-refresh state.
 * Shows an arrow that rotates as user pulls, a loading spinner when refreshing.
 */
export function PullIndicator({ pullDistance, isRefreshing, threshold, progress, direction }) {
  if (!direction && !isRefreshing) return null;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-transform"
      style={{
        height: isRefreshing ? 56 : pullDistance,
        transition: pullDistance === 0 ? 'height 0.3s ease, transform 0.3s ease' : 'none',
      }}
    >
      {isRefreshing ? (
        <div className="flex items-center gap-2 text-violet-600">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">Refreshing...</span>
        </div>
      ) : (
        <div
          className="flex items-center gap-2 transition-colors"
          style={{
            color: progress >= 1 ? '#7c3aed' : '#94a3b8',
          }}
        >
          <svg
            className="w-5 h-5 transition-transform"
            style={{
              transform: `rotate(${progress >= 1 ? 180 : progress * 180}deg)`,
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
          <span className="text-xs font-bold uppercase tracking-wider">
            {progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}
    </div>
  );
}

export default usePullToRefresh;

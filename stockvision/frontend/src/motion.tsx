import React, { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';

/**
 * Shared motion durations and easings
 */
export const MOTION_DURATIONS = {
  fast: 0.15, // 150ms
  base: 0.25, // 250ms
  page: 0.2, // 200ms
  number: 0.5, // 500ms
  sweep: 0.7, // 700ms
  forecast: 0.8, // 800ms
  chart: 1.6, // 1600ms
} as const;

export const MOTION_EASINGS = {
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.4, 0, 0.2, 1] as const,
  spring: { type: 'spring', damping: 25, stiffness: 200 },
};

/**
 * 1. HighlightSweep:
 * The yellow highlight sweeps left to right behind the key phrase (0.7s) on first load.
 * Replays when key phrase changes.
 */
interface HighlightSweepProps {
  children: React.ReactNode;
  triggerKey?: string | number;
  className?: string;
}

export const HighlightSweep: React.FC<HighlightSweepProps> = ({
  children,
  triggerKey,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <span
        className={`bg-[#FDE047] text-[#0B0B0B] px-1.5 py-0.5 rounded-[4px] font-extrabold ${className}`}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      key={triggerKey}
      className={`highlight-sweep-anim font-extrabold ${className}`}
    >
      {children}
    </span>
  );
};

/**
 * 4. AnimatedNumber:
 * Prices, predictions, percentages and metrics tick smoothly from old to new value over 500ms.
 * On first load, counts from yesterday's close / startValue (not from zero!).
 */
interface AnimatedNumberProps {
  value: number;
  startValue?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  startValue,
  decimals = 2,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(() => {
    return startValue !== undefined ? startValue : value;
  });
  const prevValueRef = useRef<number>(startValue !== undefined ? startValue : value);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const start = prevValueRef.current;
    const end = value;
    if (start === end) return;

    const startTime = performance.now();
    const duration = MOTION_DURATIONS.number * 1000;

    let animFrame: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + (end - start) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        setDisplayValue(end);
        prevValueRef.current = end;
      }
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [value, shouldReduceMotion]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};

/**
 * 5. Page transitions:
 * Content fades and slides up 8px over 200ms.
 */
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: MOTION_DURATIONS.page,
        ease: MOTION_EASINGS.easeOut,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * 6. Calm pulsing loading placeholder:
 * While a forecast is computed, show "Working out the forecast..." with a slow pulsing dot.
 */
interface LoadingSentenceProps {
  message?: string;
}

export const LoadingSentence: React.FC<LoadingSentenceProps> = ({
  message = 'Working out the forecast...',
}) => {
  return (
    <div className="flex items-center space-x-2 py-4 text-base sm:text-lg text-ink-muted">
      <span>{message}</span>
      <motion.span
        animate={{ opacity: [0.2, 1, 0.2] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        className="inline-block h-2 w-2 rounded-full bg-forecast"
      />
    </div>
  );
};

/**
 * Tooltip explanation component with plain question mark:
 * One-sentence plain-English tooltips for jargon terms.
 */
interface TooltipInfoProps {
  term: string;
  explanation: string;
}

export const TooltipInfo: React.FC<TooltipInfoProps> = ({ term, explanation }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center group">
      <span>{term}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-label={`What is ${term}?`}
        className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full border border-divider text-[10px] font-bold text-ink-muted hover:text-ink hover:border-ink transition-colors cursor-help"
      >
        ?
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-2.5 rounded-[8px] bg-ink text-white text-xs leading-relaxed shadow-lg pointer-events-none text-left font-normal"
          >
            {explanation}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-ink" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

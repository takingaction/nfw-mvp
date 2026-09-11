import { useEffect, useRef, useState } from "react";
import { Text, type TextProps } from "react-native";

import { formatCurrency } from "@/lib/format";

type Props = TextProps & {
  value: number;
  durationMs?: number;
};

/**
 * Count-up currency text. Web: components/dashboard/MembershipImpactCard.tsx uses
 * an IntersectionObserver-triggered 1800 ms cubic ease-out count; on mobile the card
 * is always in view on mount, so we animate immediately whenever `value` changes.
 */
export function AnimatedCurrency({ value, durationMs = 1800, style, ...rest }: Props) {
  // Track the target we last animated to, so a re-render with the same value
  // doesn't restart the animation, and a new value starts from the current display.
  const [animated, setAnimated] = useState<{ target: number; display: number }>({ target: value, display: 0 });
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    const to = Math.max(0, value);
    if (from === to) return;

    let frame = 0;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (to - from) * eased);
      displayRef.current = next;
      setAnimated({ target: to, display: next });
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <Text {...rest} style={style}>
      {formatCurrency(animated.display)}
    </Text>
  );
}

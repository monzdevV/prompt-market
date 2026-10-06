import { transform, useTransform, type MotionValue } from "motion/react";

// Function form opts out of motion's native ScrollTimeline acceleration, which mis-maps sticky offsets.
export function useFade<T extends number | string>(p: MotionValue<number>, input: number[], output: T[]) {
  const map = transform(input, output) as (v: number) => T;
  return useTransform(p, (v) => map(v));
}

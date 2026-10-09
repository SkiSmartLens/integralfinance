/** Picks up to 5 evenly-spaced values from an array, always including the first and last. */
export function fiveEvenTicks(values: number[]): number[] {
  if (values.length <= 5) return values;
  const idxs = [0, 1, 2, 3, 4].map((i) => Math.round((i * (values.length - 1)) / 4));
  return [...new Set(idxs)].map((i) => values[i]);
}

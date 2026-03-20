// Tiny helper used when building optional query objects without treating empty strings as nil.
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Quote a string for safe use in Unix-style shells
 */
export function quote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

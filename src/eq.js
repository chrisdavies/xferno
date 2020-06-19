/**
 * Basic equalitiy check. Doesn't do a deep diff, only a shallow comparison
 * of array values or Object key/value pairs.
 *
 * @param {*} a
 * @param {*} b
 */
export function eq(a, b) {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const aentries = Object.entries(a);
    const bentries = Object.entries(b);
    return (
      aentries.length === bentries.length &&
      aentries.every(([ka, va], i) => {
        const [kb, vb] = bentries[i];
        return ka === kb && va === vb;
      })
    );
  }

  return false;
}

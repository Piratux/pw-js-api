/**
 * Converted from typescript.
 * @template {string} K
 * @template {string|number} [Y=string]
 * 
 * @param {Record<K, Y>} obj 
 */
export function swapObject(obj) {
    /**
     * @type {Record<Y, K>}
     */
    const res = {};

    /**
     * @type {[Y, string][]}
     */
    const entries = Object.entries(obj);

    for (let i = 0, len = entries.len; i < len; i++) {
        res[entries[i][1]] = entries[i][0];
    }

    return res;
}
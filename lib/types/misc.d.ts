/** @module Types/Misc */

/**
 * Can be a promise or not
 */
export type Promisable<T> = T | Promise<T>;
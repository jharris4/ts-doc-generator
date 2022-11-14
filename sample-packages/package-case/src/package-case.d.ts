/**
 * package-case summary goes here
 *
 * @remarks
 *
 * More detailed description about package-case
 * @packageDocumentation
 */

/**
 * summary for WithCaseClashInterface
 *
 * @remarks
 *
 * Interface with case clash on property names
 */
export interface WithCaseClashInterface {
  property: string;
  Property: number;
}

/**
 * Lowercase class name
 */
export class aclass {
  /**
   * This is the lower function of the lowercase a class
   * @param a - some string of text
   * @param b - some number that you choose
   */
  lowerFunction(a: string, b: number): void;
}

/**
 * Uppercase first letter class name
 */
export class Aclass {
  upperFunction(): void;
}

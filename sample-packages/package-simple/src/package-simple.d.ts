interface PackageSimpleLocalInterface {
  propertyOne: string;
}

/**
 * This is a really simple interface, the first one
 */
export interface PackageSimpleInterfaceOne {
  /**
   * This is the first property of the first simple interface.
   *
   * @defaultValue 123
   */
  property1: number;
  /**
   * This is the second property of the first simple interface.
   */
  property2: string;
  /**
   * This is the third property of the first simple interface.
   *
   * @defaultValue
   * The default is `456` unless
   *  `Some.Flag` was specified.
   */
  property3: boolean;
  /**
   * This is the test event property
   * @eventProperty
   */
  propertyEvent: Event;
}

/**
 * This is the first simple function, it returns nothing
 */
export type simpleFunctionOne = (arg: string) => void;
/**
 * This is the second simple function, it returns a `PackageSimpleInterfaceOne`
 */
export type simpleFunctionTwo = (
  arg: PackageSimpleLocalInterface
) => PackageSimpleInterfaceOne;
export type simpleFunctionThree = (
  arg: PackageSimpleLocalInterface[]
) => PackageSimpleInterfaceOne[];

class PackageSimpleLocalClass {
  constructor(properties: any);

  version: number;
  file: string;

  /**
   * Returns the equivalent of `JSON.stringify()`
   */
  toString(): string;
  /**
   * return a url for the class, here's a code example
   * `fetchPackageSimple(options?: PackageSimpleLocalClass): string;`
   */
  toUrl(): string;
}

export class PackageSimpleClass extends PackageSimpleLocalClass {
  constructor(properties: any);

  subVersion: number;
  subFile: string;
  subFunction: (arg1: Array<number>) => Array<number>;

  /**
   * Returns the sub equivalent of `JSON.stringify()`
   */
  toSubString(arg1: string): string;
  /**
   * return a sub url for the class, here's a code example
   * `fetchSubPackageSimple(options?: PackageSimpleClass): string;`
   */
  toSubUrl(): string;

  toSubFunction(
    arg1: (arg1: Array<number>) => Array<number>
  ): (a: string) => Array<boolean>;
  toSubFunctionArray(
    arg1: (arg1: number[]) => number[]
  ): (a: string) => boolean[];
}

export enum PackageSimpleEnum {
  /**
   * The value for 1.
   */
  EnumValueOne,

  /**
   * The value for 2 with value `EnumValueTwo`.
   */
  EnumValueTwo,
}

export enum PackageSimpleEnumValues {
  Up = 1,
  Down,
  Left,
  Right,
}

/**
 * This is the simple function description
 * @param x The number
 */
export declare function PackageSimpleFunctionOne(x?: number): void;

/**
 * This is the simple variable function description
 */
export declare const PackageSimpleVariableFunction: (x?: number) => void;

/**
 * This is the simple variable string description
 */
export declare const PackageSimpleVariableString: string;

interface PackageSimpleLocalInterface {
  propertyOne: string;
}

export interface PackageSimpleInterfaceOne {
  property1: number;
}

export type simpleFunctionOne = (arg: string) => void;
export type simpleFunctionTwo = (arg: PackageSimpleLocalInterface) => PackageSimpleInterfaceOne;
export type simpleFunctionThree = (arg: PackageSimpleLocalInterface[]) => PackageSimpleInterfaceOne[];

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

  toSubFunction(arg1: (arg1: Array<number>) => Array<number>): (a:string) => Array<boolean>;
  toSubFunctionArray(arg1: (arg1: number[]) => number[]): (a:string) => boolean[];
}

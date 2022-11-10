import { ParentInterface, ParentClass } from "package-parent";

/**
 * ChildInterface remarks goes here
 *
 * @remarks
 *
 * These are the longer more detailed remarks about the ChildInterface
 *
 * @privateRemarks
 *
 * These are private remarks about ChildInterface
 */
export interface ChildInterface extends ParentInterface {
  childPropertyOne: boolean;
}

export class ChildClass extends ParentClass {
  childClassPropertyOne: number;

  childClassMemberOne(argOne: boolean): string;
}

export interface MixinInterface {
  pOne: ParentInterface;
  pTwo: ParentClass;
  pThree: Number;
}

export class MixinClass {
  pOne: ParentInterface;
  pTwo: ParentClass;
  pThree: ChildInterface;
  pFour: ChildClass;
  pFive: Number;
  pSix: number = 5;
  pSeven: Array<ChildClass>;
  pEight: ChildClass[];

  mOne(argOne: ParentClass): ParentInterface;
  mTwo(argOne: ChildClass): ChildInterface;
  mThree(argOne: Array<ChildClass>): Array<ChildInterface>;
  mFour(argOne: ChildClass[]): ChildInterface[];
}

export type functionOne = (argOne: ParentClass[]) => ChildClass[];

export enum PackageChildEnumValues {
  Up = 1,
  Down,
  Left,
  Right,
}

/**
 * This is the child function description
 * @param x The number
 */
export declare function PackageChildFunctionOne(
  x: number,
  a: PackageChildEnumValues,
  c: ParentClass
): void;

/**
 * This is the child variable function description
 */
export declare const PackageChildVariableFunction: (
  x: number,
  a: PackageChildEnumValues,
  c: ParentClass
) => void;

/**
 * This is the child variable string description
 */
export declare const PackageChildVariableString: string;

/**
 * This is the child variable enum description
 */
export declare const PackageChildVariableEnum: PackageChildEnumValues;

/**
 * This is the child variable parent description
 */
export declare const PackageChildVariableParent: ParentClass;

import { ParentInterface, ParentClass } from "package-parent";

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

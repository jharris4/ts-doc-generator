export interface ParentInterface {
  parentPropertyOne: number;
  parentPropertyTwo: Array<boolean>;
}

export interface ParentInterfaceTwo {
  parentSecondProperty1: string;
}

export interface ParentInterfaceThree {
  parentThirdProperty1: boolean;
}

export class ParentClass {
  parentClassPropertyOne: string;
  parentClassPropertyTwo: Array<number>;
  parentClassPropertyFunc: (arg1: ParentInterface) => ParentInterface;
  parentClassPropertyFuncNestedType: (
    arg1: Array<ParentInterface>
  ) => Array<ParentInterface>;

  parentClassMemberOne(argOne: number): boolean;
  parentClassMemberTwo(argOne: string): Array<boolean>;
  parentClassMemberFunc(
    argOne: (arg1: ParentInterface) => ParentInterfaceTwo
  ): (arg1: ParentInterfaceTwo) => ParentInterfaceThree;
  parentClassMemberFuncNestedType(
    argOne: Array<ParentInterface>
  ): Array<ParentInterface>;
}

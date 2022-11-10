export declare namespace PackageNamespaceA {
  export interface NamespacedInterface {
    parentPropertyOne: number;
    parentPropertyTwo: Array<boolean>;
  }

  export interface NamespacedInterfaceTwo {
    parentSecondProperty1: string;
  }

  export interface NamespacedInterfaceThree {
    parentThirdProperty1: boolean;
  }

  export class NamespacedClass {
    parentClassPropertyOne: string;
    parentClassPropertyTwo: Array<number>;
    parentClassPropertyFunc: (arg1: NamespacedInterface) => NamespacedInterface;
    parentClassPropertyFuncNestedType: (
      arg1: Array<NamespacedInterface>
    ) => Array<NamespacedInterface>;

    parentClassMemberOne(argOne: number): boolean;
    parentClassMemberTwo(argOne: string): Array<boolean>;
    parentClassMemberFunc(
      argOne: (arg1: NamespacedInterface) => NamespacedInterfaceTwo
    ): (arg1: NamespacedInterfaceTwo) => NamespacedInterfaceThree;
    parentClassMemberFuncNestedType(
      argOne: Array<NamespacedInterface>
    ): Array<NamespacedInterface>;
  }
}

export declare namespace PackageNamespaceB {
  export interface JustOneInterface {
    justOneProp: string;
  }
}

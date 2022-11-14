export interface InterfaceForFunction {
  (paramA: string, paramB: number): boolean;
}

export interface InterfaceContainingFunction {
  propertyA: number;
  onFunction: (theFunction: InterfaceForFunction) => void;
}

// export type ListenerOne = (paramA: string, paramB: boolean) => void;
// export type ListenerTwo = (paramA: string, paramB: number) => void;

export interface ListenerOne {
  (paramA: string, paramB: boolean): void;
}
export interface ListenerTwo {
  (paramA: string, paramB: number): void;
}

export interface HasEventListeners {
  onEventOne: (arg: ListenerOne) => void;
  offEventOne: (arg: ListenerOne) => void;
  onEventTwo: (arg: ListenerTwo) => void;
  offEventTwo: (arg: ListenerTwo) => void;
}


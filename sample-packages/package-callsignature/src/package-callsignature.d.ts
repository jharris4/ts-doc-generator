/**
 * This package shows how the markdown documenter can handle call signatures
 *
 * @remarks
 *
 * The original documenter did not support outputting call signatures, this is a new feature.
 * @packageDocumentation
 */

/**
 * Interface with a single call signature member.
 *
 * @remarks
 *
 * This interface is functionally equivalent to `type InterfaceForFunction = (paramA: string, paramB: number) => boolean`
 */
export interface InterfaceForFunction {
  /**
   * The call signature allows documentation for the call signature parameters
   *
   * @remarks
   *
   * The call signature can also have remarks
   * @param paramA - Here we can add docs for paramA
   * @param paramB - Here we can also add docs for paramB
   */
  (paramA: string, paramB: number): boolean;
}

/**
 * Interface with a member who's parameter is an interface with single call signature member.
 *
 * @remarks
 *
 * This interface demonstrates that a member's parameters can be linked to other types
 */
export interface InterfaceContainingFunction {
  /**
   * This is some random property
   */
  propertyA: number;
  /**
   * This is the member with parameter that references the interface call function to demonstrate the link
   * @param theFunction - This is the reference to the interface call signature
   */
  onFunction: (theFunction: InterfaceForFunction) => void;
}

/**
 * This is the first sample listener interface call function
 */
export interface ListenerOne {
  /**
   * The listener one call signature allows documentation for the call signature parameters
   * @param paramA - Here we can add docs for listener one paramA
   * @param paramB - Here we can also add docs for listener one paramB
   */
  (paramA: string, paramB: boolean): void;
}

/**
 * This is the second sample listener interface call function
 */
export interface ListenerTwo {
  /**
   * The listener two call signature allows documentation for the call signature parameters
   * @param paramA - Here we can add docs for listener two paramA
   * @param paramB - Here we can also add docs for listener two paramB
   */
  (paramA: string, paramB: SomeEnum): void;
}

/**
 * Interface that demonstrates an event emitter with listener management
 *
 * @remarks
 *
 * This interface demonstrates a common pattern where there are typed add/remove event listener functions
 * that expect the listener to have a specific call signature
 */
export interface HasEventListeners {
  /**
   * Adds a first listener
   * @param listenerOne - Here we can add docs for listenerOne
   */
  onEventOne: (listenerOne: ListenerOne) => void;
  /**
   * Removes a first listener
   * @param listenerOne - Here we can add docs for listenerOne
   */
  offEventOne: (listenerOne: ListenerOne) => void;
  /**
   * Adds a second listener
   * @param listenerTwo - Here we can add docs for listenerTwo
   */
  onEventTwo: (listenerTwo: ListenerTwo) => void;
  /**
   * Removes a second listener
   * @param listenerTwo - Here we can add docs for listenerTwo
   */
  offEventTwo: (listenerTwo: ListenerTwo) => void;
}

/**
 * This enum is referenced by other examples
 *
 * @remarks
 *
 * It is referred to by the {@link package-callsignature#ListenerTwo | ListenerTwo} interface call signature parameters
 */
export enum SomeEnum {
  /**
   * The docs for value one.
   */
  ValueOne,
  /**
   * The docs for value two.
   */
  ValueTwo,
  /**
   * The docs for value three.
   */
  ValueThree,
}

/**
 * This is a type alias for a simple function
 *
 * @remarks
 *
 * Unfortunately it does not support documentation for the parameters
 * @param paramA - Docs for type paramA
 * @param paramB - Docs for type paramB
 */
export type TypeListener = (paramA: string, paramB: boolean) => void;

/**
 * An empty interface
 *
 * @remarks
 *
 * This interface is used as a parent interface by {@link package-callsignature#ChildInterface | ChildInterface}
 */
export interface EmptyInterface {}

/**
 * Child interface
 *
 * @remarks
 *
 * This interface demonstrates that call signatures are not collapsed for child interfaces
 */
export interface ChildInterface extends EmptyInterface {
  /**
   * The child interface call signature allows documentation for the call signature parameters
   * @param paramA - Here we can add docs for child interface paramA
   * @param paramB - Here we can also add docs for child interface paramB
   */
  (paramA: string, paramB: SomeEnum): void;
}

/**
 * Mixed interface
 *
 * @remarks
 *
 * This interface demonstrates that call signatures are not collapsed for interfaces that don't have exatly one call signature member
 */
export interface MixedInterface {
  /**
   * The mixed interface call signature allows documentation for the call signature parameters
   * @param paramA - Here we can add docs for mixed interface paramA
   * @param paramB - Here we can also add docs for mixed interface paramB
   */
  (paramA: string, paramB: SomeEnum): void;
  /**
   * This is a property that means this interface will not be collapsed
   */
  someProperty: number;
}

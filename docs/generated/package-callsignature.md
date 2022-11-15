<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [package-callsignature](./package-callsignature.md)

## package-callsignature package

---

### Enumerations:

|  Enumeration |
|  --- |
|  [SomeEnum](#someenum) |

<a name="someenum"></a>

### SomeEnum enum

<b>Signature:</b>

```typescript
export enum SomeEnum 
```

#### Enumeration Members:

|  Member |
|  --- |
|  ValueOne |
|  ValueThree |
|  ValueTwo |

---

### Function Interfaces:

|  Interface |
|  --- |
|  [InterfaceForFunction](#interfaceforfunction) |
|  [ListenerOne](#listenerone) |
|  [ListenerTwo](#listenertwo) |

<a name="interfaceforfunction"></a>

#### InterfaceForFunction function interface

<b>Signature:</b>

```typescript
export interface InterfaceForFunction {
  (paramA: string, paramB: number): boolean;
}
```
<b>Parameters:</b>

|  Parameter | Type |
|  --- | --- |
|  paramA | string |
|  paramB | number |

<b>Returns:</b>

boolean

<a name="listenerone"></a>

#### ListenerOne function interface

<b>Signature:</b>

```typescript
export interface ListenerOne {
  (paramA: string, paramB: boolean): void;
}
```
<b>Parameters:</b>

|  Parameter | Type |
|  --- | --- |
|  paramA | string |
|  paramB | boolean |

<b>Returns:</b>

void

<a name="listenertwo"></a>

#### ListenerTwo function interface

<b>Signature:</b>

```typescript
export interface ListenerTwo {
  (paramA: string, paramB: SomeEnum): void;
}
```
<b>Parameters:</b>

|  Parameter | Type |
|  --- | --- |
|  paramA | string |
|  paramB | [SomeEnum](#someenum) |

<b>Returns:</b>

void

---

### Interfaces:

|  Interface |
|  --- |
|  [HasEventListeners](#haseventlisteners) |
|  [InterfaceContainingFunction](#interfacecontainingfunction) |

<a name="haseventlisteners"></a>

### HasEventListeners interface

<b>Signature:</b>

```typescript
export interface HasEventListeners 
```

#### Properties:

|  Property | Type |
|  --- | --- |
|  [offEventOne](#haseventlisteners.offeventone) | (arg: [ListenerOne](#listenerone)<!-- -->) =&gt; void |
|  [offEventTwo](#haseventlisteners.offeventtwo) | (arg: [ListenerTwo](#listenertwo)<!-- -->) =&gt; void |
|  [onEventOne](#haseventlisteners.oneventone) | (arg: [ListenerOne](#listenerone)<!-- -->) =&gt; void |
|  [onEventTwo](#haseventlisteners.oneventtwo) | (arg: [ListenerTwo](#listenertwo)<!-- -->) =&gt; void |

<a name="haseventlisteners.offeventone"></a>

#### HasEventListeners.offEventOne property

<b>Signature:</b>

```typescript
offEventOne: (arg: ListenerOne) => void;
```

<a name="haseventlisteners.offeventtwo"></a>

#### HasEventListeners.offEventTwo property

<b>Signature:</b>

```typescript
offEventTwo: (arg: ListenerTwo) => void;
```

<a name="haseventlisteners.oneventone"></a>

#### HasEventListeners.onEventOne property

<b>Signature:</b>

```typescript
onEventOne: (arg: ListenerOne) => void;
```

<a name="haseventlisteners.oneventtwo"></a>

#### HasEventListeners.onEventTwo property

<b>Signature:</b>

```typescript
onEventTwo: (arg: ListenerTwo) => void;
```

<a name="interfacecontainingfunction"></a>

### InterfaceContainingFunction interface

<b>Signature:</b>

```typescript
export interface InterfaceContainingFunction 
```

#### Properties:

|  Property | Type |
|  --- | --- |
|  [onFunction](#interfacecontainingfunction.onfunction) | (theFunction: [InterfaceForFunction](#interfaceforfunction)<!-- -->) =&gt; void |
|  [propertyA](#interfacecontainingfunction.propertya) | number |

<a name="interfacecontainingfunction.onfunction"></a>

#### InterfaceContainingFunction.onFunction property

<b>Signature:</b>

```typescript
onFunction: (theFunction: InterfaceForFunction) => void;
```

<a name="interfacecontainingfunction.propertya"></a>

#### InterfaceContainingFunction.propertyA property

<b>Signature:</b>

```typescript
propertyA: number;
```

---

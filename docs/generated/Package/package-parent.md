<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [package-parent](./package-parent.md)

## package-parent package

---

### Classes:

|  Class |
|  --- |
|  [ParentClass](#parentclass) |

<a name="parentclass"></a>

### ParentClass class

<b>Signature:</b>

```typescript
export class ParentClass 
```

#### Properties:

|  Property | Type |
|  --- | --- |
|  [parentClassPropertyFunc](#parentclass.parentclasspropertyfunc) | (arg1: [ParentInterface](#parentinterface)<!-- -->) =&gt; [ParentInterface](#parentinterface) |
|  [parentClassPropertyFuncNestedType](#parentclass.parentclasspropertyfuncnestedtype) | ( arg1: Array&lt;[ParentInterface](#parentinterface)<!-- -->&gt; ) =&gt; Array&lt;[ParentInterface](#parentinterface)<!-- -->&gt; |
|  [parentClassPropertyOne](#parentclass.parentclasspropertyone) | string |
|  [parentClassPropertyTwo](#parentclass.parentclasspropertytwo) | Array&lt;number&gt; |

<a name="parentclass.parentclasspropertyfunc"></a>

#### ParentClass.parentClassPropertyFunc property

<b>Signature:</b>

```typescript
parentClassPropertyFunc: (arg1: ParentInterface) => ParentInterface;
```

<a name="parentclass.parentclasspropertyfuncnestedtype"></a>

#### ParentClass.parentClassPropertyFuncNestedType property

<b>Signature:</b>

```typescript
parentClassPropertyFuncNestedType: (
    arg1: Array<ParentInterface>
  ) => Array<ParentInterface>;
```

<a name="parentclass.parentclasspropertyone"></a>

#### ParentClass.parentClassPropertyOne property

<b>Signature:</b>

```typescript
parentClassPropertyOne: string;
```

<a name="parentclass.parentclasspropertytwo"></a>

#### ParentClass.parentClassPropertyTwo property

<b>Signature:</b>

```typescript
parentClassPropertyTwo: Array<number>;
```

#### Methods:

|  Method |
|  --- |
|  [parentClassMemberFunc(argOne)](#parentclass.parentclassmemberfunc) |
|  [parentClassMemberFuncNestedType(argOne)](#parentclass.parentclassmemberfuncnestedtype) |
|  [parentClassMemberOne(argOne)](#parentclass.parentclassmemberone) |
|  [parentClassMemberTwo(argOne)](#parentclass.parentclassmembertwo) |

<a name="parentclass.parentclassmemberfunc"></a>

#### ParentClass.parentClassMemberFunc() method

<b>Signature:</b>

```typescript
parentClassMemberFunc(
    argOne: (arg1: ParentInterface) => ParentInterfaceTwo
  ): (arg1: ParentInterfaceTwo) => ParentInterfaceThree;
```
<b>Parameters:</b>

|  Parameter | Type |
|  --- | --- |
|  argOne | (arg1: [ParentInterface](#parentinterface)<!-- -->) =&gt; [ParentInterfaceTwo](#parentinterfacetwo) |

<b>Returns:</b>

(arg1: [ParentInterfaceTwo](#parentinterfacetwo)<!-- -->) =&gt; [ParentInterfaceThree](#parentinterfacethree)

<a name="parentclass.parentclassmemberfuncnestedtype"></a>

#### ParentClass.parentClassMemberFuncNestedType() method

<b>Signature:</b>

```typescript
parentClassMemberFuncNestedType(
    argOne: Array<ParentInterface>
  ): Array<ParentInterface>;
```
<b>Parameters:</b>

|  Parameter | Type |
|  --- | --- |
|  argOne | Array&lt;[ParentInterface](#parentinterface)<!-- -->&gt; |

<b>Returns:</b>

Array&lt;[ParentInterface](#parentinterface)<!-- -->&gt;

<a name="parentclass.parentclassmemberone"></a>

#### ParentClass.parentClassMemberOne() method

<b>Signature:</b>

```typescript
parentClassMemberOne(argOne: number): boolean;
```
<b>Parameters:</b>

|  Parameter | Type |
|  --- | --- |
|  argOne | number |

<b>Returns:</b>

boolean

<a name="parentclass.parentclassmembertwo"></a>

#### ParentClass.parentClassMemberTwo() method

<b>Signature:</b>

```typescript
parentClassMemberTwo(argOne: string): Array<boolean>;
```
<b>Parameters:</b>

|  Parameter | Type |
|  --- | --- |
|  argOne | string |

<b>Returns:</b>

Array&lt;boolean&gt;

---

### Interfaces:

|  Interface |
|  --- |
|  [ParentInterface](#parentinterface) |
|  [ParentInterfaceThree](#parentinterfacethree) |
|  [ParentInterfaceTwo](#parentinterfacetwo) |

<a name="parentinterface"></a>

### ParentInterface interface

<b>Signature:</b>

```typescript
export interface ParentInterface 
```

#### Properties:

|  Property | Type |
|  --- | --- |
|  [parentPropertyOne](#parentinterface.parentpropertyone) | number |
|  [parentPropertyTwo](#parentinterface.parentpropertytwo) | Array&lt;boolean&gt; |

<a name="parentinterface.parentpropertyone"></a>

#### ParentInterface.parentPropertyOne property

<b>Signature:</b>

```typescript
parentPropertyOne: number;
```

<a name="parentinterface.parentpropertytwo"></a>

#### ParentInterface.parentPropertyTwo property

<b>Signature:</b>

```typescript
parentPropertyTwo: Array<boolean>;
```

<a name="parentinterfacethree"></a>

### ParentInterfaceThree interface

<b>Signature:</b>

```typescript
export interface ParentInterfaceThree 
```

#### Properties:

|  Property | Type |
|  --- | --- |
|  [parentThirdProperty1](#parentinterfacethree.parentthirdproperty1) | boolean |

<a name="parentinterfacethree.parentthirdproperty1"></a>

#### ParentInterfaceThree.parentThirdProperty1 property

<b>Signature:</b>

```typescript
parentThirdProperty1: boolean;
```

<a name="parentinterfacetwo"></a>

### ParentInterfaceTwo interface

<b>Signature:</b>

```typescript
export interface ParentInterfaceTwo 
```

#### Properties:

|  Property | Type |
|  --- | --- |
|  [parentSecondProperty1](#parentinterfacetwo.parentsecondproperty1) | string |

<a name="parentinterfacetwo.parentsecondproperty1"></a>

#### ParentInterfaceTwo.parentSecondProperty1 property

<b>Signature:</b>

```typescript
parentSecondProperty1: string;
```

---

<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [package-callsignature](./package-callsignature.md) &gt; [InterfaceContainingFunction](./package-callsignature.interfacecontainingfunction.md)

## InterfaceContainingFunction interface

Interface with a member who's parameter is an interface with single call signature member.

<b>Signature:</b>

```typescript
export interface InterfaceContainingFunction 
```

### Remarks:

This interface demonstrates that a member's parameters can be linked to other types

---

### Properties:

|  Property | Type | Description |
|  --- | --- | --- |
|  [onFunction](#onfunction) | (theFunction: [InterfaceForFunction](./package-callsignature.interfaceforfunction.md)<!-- -->) =&gt; void | This is the member with parameter that references the interface call function to demonstrate the link |
|  [propertyA](#propertya) | number | This is some random property |

<a name="onfunction"></a>

### InterfaceContainingFunction.onFunction property

This is the member with parameter that references the interface call function to demonstrate the link

<b>Signature:</b>

```typescript
onFunction: (theFunction: InterfaceForFunction) => void;
```

<br>

<a name="propertya"></a>

### InterfaceContainingFunction.propertyA property

This is some random property

<b>Signature:</b>

```typescript
propertyA: number;
```

---

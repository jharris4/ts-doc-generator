<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [package-callsignature](./package-callsignature.md) &gt; [MixedInterface](./package-callsignature.mixedinterface.md)

## MixedInterface interface

Mixed interface

<b>Signature:</b>

```typescript
export interface MixedInterface 
```

### Remarks:

This interface demonstrates that call signatures are not collapsed for interfaces that don't have exatly one call signature member

---

### Properties:

|  Property | Type | Description |
|  --- | --- | --- |
|  [someProperty](#someproperty) | number | This is a property that means this interface will not be collapsed |

<a name="someproperty"></a>

### MixedInterface.someProperty property

This is a property that means this interface will not be collapsed

<b>Signature:</b>

```typescript
someProperty: number;
```

---

### Call Signatures:

|  Call Signature | Description |
|  --- | --- |
|  [call-1](#call-1) | The mixed interface call signature allows documentation for the call signature parameters |

<a name="call-1"></a>

### MixedInterface.call-1 call signature

The mixed interface call signature allows documentation for the call signature parameters

<b>Signature:</b>

```typescript
(paramA: string, paramB: SomeEnum): void;
```

#### Parameters:

|  Parameter | Type | Description |
|  --- | --- | --- |
|  paramA | string | Here we can add docs for mixed interface paramA |
|  paramB | [SomeEnum](./package-callsignature.someenum.md) | Here we can also add docs for mixed interface paramB |

<b>Returns:</b>

void

---

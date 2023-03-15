[@algorandfoundation/algokit-utils](../README.md) / [index](../modules/index.md) / CreateAppParams

# Interface: CreateAppParams

[index](../modules/index.md).CreateAppParams

Parameters that are passed in when creating an app.

## Hierarchy

- `CreateOrUpdateAppParams`

  ↳ **`CreateAppParams`**

## Table of contents

### Properties

- [approvalProgram](index.CreateAppParams.md#approvalprogram)
- [args](index.CreateAppParams.md#args)
- [clearStateProgram](index.CreateAppParams.md#clearstateprogram)
- [from](index.CreateAppParams.md#from)
- [maxFee](index.CreateAppParams.md#maxfee)
- [maxRoundsToWaitForConfirmation](index.CreateAppParams.md#maxroundstowaitforconfirmation)
- [note](index.CreateAppParams.md#note)
- [schema](index.CreateAppParams.md#schema)
- [skipSending](index.CreateAppParams.md#skipsending)
- [skipWaiting](index.CreateAppParams.md#skipwaiting)
- [suppressLog](index.CreateAppParams.md#suppresslog)
- [transactionParams](index.CreateAppParams.md#transactionparams)

## Properties

### approvalProgram

• **approvalProgram**: `string` \| `Uint8Array`

The approval program as raw teal (string) or compiled teal, base 64 encoded as a byte array (Uint8Array)

#### Inherited from

CreateOrUpdateAppParams.approvalProgram

#### Defined in

[app.ts:98](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/app.ts#L98)

___

### args

• `Optional` **args**: [`AppCallArgs`](../modules/index.md#appcallargs)

The arguments passed in to the app call

#### Inherited from

CreateOrUpdateAppParams.args

#### Defined in

[app.ts:106](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/app.ts#L106)

___

### clearStateProgram

• **clearStateProgram**: `string` \| `Uint8Array`

The clear state program as raw teal (string) or compiled teal, base 64 encoded as a byte array (Uint8Array)

#### Inherited from

CreateOrUpdateAppParams.clearStateProgram

#### Defined in

[app.ts:100](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/app.ts#L100)

___

### from

• **from**: [`SendTransactionFrom`](../modules/index.md#sendtransactionfrom)

The account (with private key loaded) that will send the µALGOs

#### Inherited from

CreateOrUpdateAppParams.from

#### Defined in

[app.ts:96](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/app.ts#L96)

___

### maxFee

• `Optional` **maxFee**: [`AlgoAmount`](../classes/index.AlgoAmount.md)

The maximum fee that you are happy to pay (default: unbounded) - if this is set it's possible the transaction could get rejected during network congestion

#### Inherited from

CreateOrUpdateAppParams.maxFee

#### Defined in

[transaction.ts:141](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/transaction.ts#L141)

___

### maxRoundsToWaitForConfirmation

• `Optional` **maxRoundsToWaitForConfirmation**: `number`

The maximum number of rounds to wait for confirmation, only applies if `skipWaiting` is `undefined` or `false`, default: wait up to 5 rounds

#### Inherited from

CreateOrUpdateAppParams.maxRoundsToWaitForConfirmation

#### Defined in

[transaction.ts:143](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/transaction.ts#L143)

___

### note

• `Optional` **note**: [`TransactionNote`](../modules/index.md#transactionnote)

The (optional) transaction note

#### Inherited from

CreateOrUpdateAppParams.note

#### Defined in

[app.ts:104](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/app.ts#L104)

___

### schema

• **schema**: [`AppStorageSchema`](index.AppStorageSchema.md)

The storage schema to request for the created app

#### Defined in

[app.ts:112](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/app.ts#L112)

___

### skipSending

• `Optional` **skipSending**: `boolean`

Whether to skip signing and sending the transaction to the chain (default: transaction signed and sent to chain)
  (and instead just return the raw transaction, e.g. so you can add it to a group of transactions)

#### Inherited from

CreateOrUpdateAppParams.skipSending

#### Defined in

[transaction.ts:135](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/transaction.ts#L135)

___

### skipWaiting

• `Optional` **skipWaiting**: `boolean`

Whether to skip waiting for the submitted transaction (only relevant if `skipSending` is `false` or unset)

#### Inherited from

CreateOrUpdateAppParams.skipWaiting

#### Defined in

[transaction.ts:137](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/transaction.ts#L137)

___

### suppressLog

• `Optional` **suppressLog**: `boolean`

Whether to suppress log messages from transaction send, default: do not suppress

#### Inherited from

CreateOrUpdateAppParams.suppressLog

#### Defined in

[transaction.ts:139](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/transaction.ts#L139)

___

### transactionParams

• `Optional` **transactionParams**: `SuggestedParams`

Optional transaction parameters

#### Inherited from

CreateOrUpdateAppParams.transactionParams

#### Defined in

[app.ts:102](https://github.com/algorandfoundation/algokit-utils-ts/blob/main/src/app.ts#L102)
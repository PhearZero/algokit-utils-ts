import algosdk, {
  ABIMethod,
  Algodv2,
  AtomicTransactionComposer,
  makeBasicAccountTransactionSigner,
  OnApplicationComplete,
  Transaction,
} from 'algosdk'
import { Buffer } from 'buffer'
import { Config } from './'
import { encodeTransactionNote, getSenderAddress, getTransactionParams, sendTransaction } from './transaction'
import { ApplicationResponse, PendingTransactionResponse } from './types/algod'
import {
  ABIReturn,
  ABI_RETURN_PREFIX,
  AppCallArgs,
  AppCallParams,
  AppCallTransactionResult,
  AppReference,
  APP_PAGE_MAX_SIZE,
  CompiledTeal,
  CreateAppParams,
  UpdateAppParams,
} from './types/app'

/**
 * Creates a smart contract app, returns the details of the created app.
 * @param create The parameters to create the app with
 * @param algod An algod client
 * @returns The details of the created app, or the transaction to create it if `skipSending`
 */
export async function createApp(create: CreateAppParams, algod: Algodv2): Promise<AppCallTransactionResult & AppReference> {
  const { from, approvalProgram: approval, clearStateProgram: clear, schema, note, transactionParams, args, ...sendParams } = create

  const approvalProgram = typeof approval === 'string' ? (await compileTeal(approval, algod)).compiledBase64ToBytes : approval
  const clearProgram = typeof clear === 'string' ? (await compileTeal(clear, algod)).compiledBase64ToBytes : clear

  const transaction = algosdk.makeApplicationCreateTxnFromObject({
    approvalProgram: approvalProgram,
    clearProgram: clearProgram,
    numLocalInts: schema.localInts,
    numLocalByteSlices: schema.localByteSlices,
    numGlobalInts: schema.globalInts,
    numGlobalByteSlices: schema.globalByteSlices,
    extraPages: schema.extraPages ?? Math.floor((approvalProgram.length + clearProgram.length) / APP_PAGE_MAX_SIZE),
    onComplete: algosdk.OnApplicationComplete.NoOpOC,
    suggestedParams: await getTransactionParams(transactionParams, algod),
    from: getSenderAddress(from),
    note: encodeTransactionNote(note),
    ...getAppArgsForTransaction(args),
    rekeyTo: undefined,
  })

  const { confirmation } = await sendTransaction({ transaction, from, sendParams }, algod)
  if (confirmation) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const appId = confirmation['application-index']!

    Config.getLogger(sendParams.suppressLog).debug(`Created app ${appId} from creator ${getSenderAddress(from)}`)

    return {
      transaction,
      confirmation,
      appId,
      appAddress: algosdk.getApplicationAddress(appId),
      return: getABIReturn(args, confirmation),
    }
  } else {
    return { transaction, appId: 0, appAddress: '' }
  }
}

/**
 * Updates a smart contract app.
 * @param update The parameters to update the app with
 * @param algod An algod client
 * @returns The transaction
 */
export async function updateApp(update: UpdateAppParams, algod: Algodv2): Promise<AppCallTransactionResult> {
  const { appId, from, approvalProgram: approval, clearStateProgram: clear, note, transactionParams, args, ...sendParams } = update

  const approvalProgram = typeof approval === 'string' ? (await compileTeal(approval, algod)).compiledBase64ToBytes : approval
  const clearProgram = typeof clear === 'string' ? (await compileTeal(clear, algod)).compiledBase64ToBytes : clear

  const transaction = algosdk.makeApplicationUpdateTxnFromObject({
    appIndex: appId,
    approvalProgram: approvalProgram,
    clearProgram: clearProgram,
    suggestedParams: await getTransactionParams(transactionParams, algod),
    from: getSenderAddress(from),
    note: encodeTransactionNote(note),
    ...getAppArgsForTransaction(args),
    rekeyTo: undefined,
  })

  Config.getLogger(sendParams.suppressLog).debug(`Updating app ${appId}`)

  const result = await sendTransaction({ transaction, from, sendParams }, algod)

  return {
    ...result,
    return: getABIReturn(args, result.confirmation),
  }
}

/**
 * Issues a call to a given app.
 * @param call The call details.
 * @param algod An algod client
 * @returns The result of the call
 */
export async function callApp(call: AppCallParams, algod: Algodv2): Promise<AppCallTransactionResult> {
  const { appId, callType, from, args, note, transactionParams, ...sendParams } = call

  const appCallParameters = {
    appIndex: appId,
    from: getSenderAddress(from),
    suggestedParams: await getTransactionParams(transactionParams, algod),
    ...getAppArgsForTransaction(args),
    note: encodeTransactionNote(note),
    rekeyTo: undefined,
  }

  let transaction: Transaction
  switch (callType) {
    case 'optin':
      transaction = algosdk.makeApplicationOptInTxnFromObject(appCallParameters)
      break
    case 'clearstate':
      transaction = algosdk.makeApplicationClearStateTxnFromObject(appCallParameters)
      break
    case 'closeout':
      transaction = algosdk.makeApplicationCloseOutTxnFromObject(appCallParameters)
      break
    case 'delete':
      transaction = algosdk.makeApplicationDeleteTxnFromObject(appCallParameters)
      break
    case 'normal':
      transaction = algosdk.makeApplicationNoOpTxnFromObject(appCallParameters)
      break
  }

  const result = await sendTransaction({ transaction, from, sendParams }, algod)

  return {
    ...result,
    return: getABIReturn(args, result.confirmation),
  }
}

export function getABIReturn(args?: AppCallArgs, confirmation?: PendingTransactionResponse): ABIReturn | undefined {
  try {
    if (!args || !('method' in args)) {
      return undefined
    }
    const method = 'txnCount' in args.method ? args.method : new ABIMethod(args.method)
    if (method.returns.type !== 'void' && confirmation) {
      const logs = confirmation.logs || []
      if (logs.length === 0) {
        throw new Error('App call transaction did not log a return value')
      }
      const lastLog = logs[logs.length - 1]
      if (lastLog.byteLength < 4 || lastLog.slice(0, 4).toString() !== ABI_RETURN_PREFIX.toString()) {
        throw new Error('App call transaction did not log a return value (ABI_RETURN_PREFIX not found)')
      }
      return {
        rawReturnValue: new Uint8Array(lastLog.slice(4)),
        returnValue: method.returns.type.decode(new Uint8Array(lastLog.slice(4))),
        decodeError: undefined,
      }
    }
  } catch (e) {
    return {
      rawReturnValue: undefined,
      returnValue: undefined,
      decodeError: e as Error,
    }
  }
  return undefined
}

/** Returns the app args ready to load onto an app @see {Transaction} object */
export function getAppArgsForTransaction(args?: AppCallArgs) {
  if (!args) return undefined

  let actualArgs: AppCallArgs
  if ('method' in args) {
    // todo: Land a change to algosdk that extract the logic from ATC, because (fair warning) this is a HACK
    // I don't want to have to rewrite all of the ABI resolution logic so using an ATC temporarily here
    // and passing stuff in to keep it happy like a randomly generated account :O
    // Most of these values aren't being used since the transaction is discarded
    const dummyAtc = new AtomicTransactionComposer()
    const dummyAccount = algosdk.generateAccount()
    const dummyAppId = 1
    const dummyParams = {
      fee: 1,
      firstRound: 1,
      genesisHash: Buffer.from('abcd', 'utf-8').toString('base64'),
      genesisID: 'a',
      lastRound: 1,
    }
    const dummyOnComplete = OnApplicationComplete.NoOpOC
    dummyAtc.addMethodCall({
      method: 'txnCount' in args.method ? args.method : new ABIMethod(args.method),
      methodArgs: args.args,
      // Rest are dummy values
      appID: dummyAppId,
      sender: dummyAccount.addr,
      signer: makeBasicAccountTransactionSigner(dummyAccount),
      suggestedParams: dummyParams,
      onComplete: dummyOnComplete,
    })
    const txn = dummyAtc.buildGroup()[0]
    actualArgs = {
      accounts: txn.txn.appAccounts,
      appArgs: txn.txn.appArgs,
      apps: txn.txn.appForeignApps,
      assets: txn.txn.appForeignAssets,
      boxes: txn.txn.boxes?.map((b) => ({
        appId: b.appIndex,
        name: b.name,
      })),
      lease: args.lease,
    }
  } else {
    actualArgs = args
  }

  const encoder = new TextEncoder()
  return {
    accounts: actualArgs?.accounts?.map((a) => (typeof a === 'string' ? a : algosdk.encodeAddress(a.publicKey))),
    appArgs: actualArgs?.appArgs?.map((a) => (typeof a === 'string' ? encoder.encode(a) : a)),
    boxes: actualArgs?.boxes?.map(
      (ref) =>
        ({
          appIndex: ref.appId,
          name: typeof ref.name === 'string' ? encoder.encode(ref.name) : ref.name,
        } as algosdk.BoxReference),
    ),
    foreignApps: actualArgs?.apps,
    foreignAssets: actualArgs?.assets,
    lease: typeof actualArgs?.lease === 'string' ? encoder.encode(actualArgs?.lease) : actualArgs?.lease,
  }
}

/**
 * Gets the current data for the given app from algod.
 *
 * @param appId The id of the app
 * @param algod An algod client
 * @returns The data about the app
 */
export async function getAppByIndex(appId: number, algod: Algodv2) {
  return (await algod.getApplicationByID(appId).do()) as ApplicationResponse
}

/**
 * Compiles the given TEAL using algod and returns the result.
 *
 * @param algod An algod client
 * @param tealCode The TEAL code
 * @returns The information about the compiled file
 */
export async function compileTeal(tealCode: string, algod: Algodv2): Promise<CompiledTeal> {
  const compiled = await algod.compile(tealCode).do()
  return {
    teal: tealCode,
    compiled: compiled.result,
    compiledHash: compiled.hash,
    compiledBase64ToBytes: new Uint8Array(Buffer.from(compiled.result, 'base64')),
  }
}

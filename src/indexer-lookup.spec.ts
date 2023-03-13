import { describe, test } from '@jest/globals'
import algosdk from 'algosdk'
import { readFile } from 'fs/promises'
import path from 'path'
import { getBareCallContractCreateParams } from '../tests/example-contracts/bare-call/contract'
import { localNetFixture } from '../tests/fixtures/localnet-fixture'
import { getTestAccount } from './account'
import { AlgoAmount } from './algo-amount'
import { createApp } from './app'
import { lookupAccountCreatedApplicationByAddress, lookupTransactionById, searchTransactions } from './indexer-lookup'
import { sendTransaction } from './transaction'

describe('indexer-lookup', () => {
  const localnet = localNetFixture()

  const getTestTransaction = async (amount?: number, from?: string) => {
    return algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      from: from ?? localnet.context.testAccount.addr,
      to: localnet.context.testAccount.addr,
      amount: amount ?? 1,
      suggestedParams: await localnet.context.algod.getTransactionParams().do(),
    })
  }

  test('Transaction is found by id', async () => {
    const { algod, indexer, testAccount, transactionLogger } = localnet.context
    const { transaction } = await sendTransaction({ transaction: await getTestTransaction(), from: testAccount }, algod)
    await transactionLogger.waitForIndexer(indexer)

    const txn = await lookupTransactionById(transaction.txID(), indexer)

    expect(txn.transaction.id).toBe(transaction.txID())
    expect(txn['current-round']).toBeGreaterThanOrEqual(transaction.firstRound)
  })

  test('Transactions are searched with pagination', async () => {
    const { algod, indexer, testAccount, transactionLogger } = localnet.context
    const secondAccount = await getTestAccount(
      {
        initialFunds: AlgoAmount.Algos(1),
        suppressLog: true,
      },
      algod,
    )
    const { transaction: transaction1 } = await sendTransaction({ transaction: await getTestTransaction(1), from: testAccount }, algod)
    const { transaction: transaction2 } = await sendTransaction({ transaction: await getTestTransaction(1), from: testAccount }, algod)
    await sendTransaction({ transaction: await getTestTransaction(1, secondAccount.addr), from: secondAccount }, algod)
    await transactionLogger.waitForIndexer(indexer)

    const transactions = await searchTransactions(indexer, (s) => s.txType('pay').addressRole('sender').address(testAccount.addr), 1)

    expect(Number(transactions['current-round'])).toBeGreaterThan(0)
    expect(transactions.transactions.map((t) => t.id).sort()).toEqual([transaction1.txID(), transaction2.txID()].sort())
  })

  test('Application create transactions are found by creator with pagination', async () => {
    const { algod, indexer, testAccount } = localnet.context
    const secondAccount = await getTestAccount(
      {
        initialFunds: AlgoAmount.Algos(1),
        suppressLog: true,
      },
      algod,
    )
    const appSpecFile = await readFile(path.join(__dirname, '..', 'tests', 'example-contracts', 'hello-world', 'application.json'))
    const appSpec = JSON.parse(await appSpecFile.toString('utf-8'))
    const createParams = await getBareCallContractCreateParams(testAccount, {
      name: 'test',
      version: '1.0',
      updatable: false,
      deletable: false,
    })
    const app1 = await createApp(createParams, algod)
    const app2 = await createApp(createParams, algod)
    const app3 = await createApp({ ...createParams, from: secondAccount }, algod)

    const apps = await lookupAccountCreatedApplicationByAddress(indexer, testAccount.addr, true, 1)

    expect(apps.map((a) => a.id).sort()).toEqual([app1.appIndex, app2.appIndex].sort())
  })
})

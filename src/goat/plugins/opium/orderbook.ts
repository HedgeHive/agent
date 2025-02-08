import { elizaLogger } from "@elizaos/core"
import assert from "assert"
import { EVMWalletClient } from "@goat-sdk/wallet-evm"

import { SignedOrder } from "./types.ts"
import { getInitialMargin, TOKEN_DECIMALS } from "./helpers.ts"
import { arbitrageOrders } from "./lop.ts"
import { createKaDDHTNetwork } from "../../../network"
import { OrderNetwork } from "../../../network/orderNetwork"

export const orderbook: Array<SignedOrder> = []

let network: undefined|OrderNetwork = undefined
createKaDDHTNetwork()
  .then(n => {
    network = n
    network.subscribe(async (o: SignedOrder) => { console.log('Received order from peers', o); orderbook.push(o) })
  })
  .catch(error => console.error('failed to create network', error))

export const addOrder = (order: SignedOrder) => {
  network?.push(order).catch(error => console.error('failed to push order', error))
  orderbook.push(order)
}

export const removeOrder = (orderHash: string) => {
  const index = orderbook.findIndex(order => order.orderHash === orderHash)
  if (index !== -1) {
    orderbook.splice(index, 1)
  }
}

const parseOrder = (order: SignedOrder) => {
  const { derivative, longPositionAddress, shortPositionAddress, orderStruct } = order

  const { shortMargin } = getInitialMargin(derivative)

  const isBuyLong = orderStruct.takerAsset.toLowerCase() === longPositionAddress.toLowerCase()
  const isSellShort = orderStruct.makerAsset.toLowerCase() === shortPositionAddress.toLowerCase()
  const isBuyShort = orderStruct.takerAsset.toLowerCase() === shortPositionAddress.toLowerCase()
  const isSellLong = orderStruct.makerAsset.toLowerCase() === longPositionAddress.toLowerCase()
  assert(isBuyLong || isSellShort || isBuyShort || isSellLong, "Unsupported order")

  const isLongOrder = isBuyLong || isSellShort

  const isBuying = isBuyLong || isBuyShort

  const totalAmount = isBuying ? BigInt(orderStruct.makingAmount) : BigInt(orderStruct.takingAmount)
  const quantity = isBuying ? BigInt(orderStruct.takingAmount) : BigInt(orderStruct.makingAmount)

  const isLongPosition = isBuyLong || isSellLong
  const totalMargin = isLongPosition ? 0n : shortMargin * quantity / BigInt(1e18)
  const totalPremium = isLongPosition ? totalAmount : totalMargin - totalAmount
  const premium = totalPremium * BigInt(1e18) / quantity

  const decimals = TOKEN_DECIMALS[derivative.token]
  assert(decimals !== undefined, "Unsupported asset")

  return {
    isLongOrder, premium, quantity
  }
}

const findMatchingOrder = (leftOrder: SignedOrder): SignedOrder | undefined => {
  const leftOrderParsed = parseOrder(leftOrder)
  elizaLogger.info({ leftOrderParsed })

  const matchingOrder: SignedOrder | undefined = orderbook.find(rightOrder => {
    const rightOrderParsed = parseOrder(rightOrder)
    elizaLogger.info({ rightOrderParsed })

    const isSameDerivative = leftOrder.derivativeHash === rightOrder.derivativeHash
    elizaLogger.info({ isSameDerivative, leftOrderDerivativeHash: leftOrder.derivativeHash, rightOrderDerivativeHash: rightOrder.derivativeHash })
    if (!isSameDerivative) { return false }

    const isMatchingPositions = leftOrderParsed.isLongOrder !== rightOrderParsed.isLongOrder
    elizaLogger.info({ isMatchingPositions, leftOrderIsLong: leftOrderParsed.isLongOrder, rightOrderIsLong: rightOrderParsed.isLongOrder })
    if (!isMatchingPositions) { return false }

    const buyOrder = leftOrderParsed.isLongOrder ? leftOrderParsed : rightOrderParsed
    const sellOrder = leftOrderParsed.isLongOrder ? rightOrderParsed : leftOrderParsed

    const isMatchingPrice = buyOrder.premium >= sellOrder.premium
    elizaLogger.info({ isMatchingPrice, buyOrderPremium: buyOrder.premium, sellOrderPremium: sellOrder.premium })
    if (!isMatchingPrice) { return false }

    const isMatchingQuantity = buyOrder.quantity <= sellOrder.quantity
    elizaLogger.info({ isMatchingQuantity, buyOrderQuantity: buyOrder.quantity, sellOrderQuantity: sellOrder.quantity })
    if (!isMatchingQuantity) { return false }

    return true
  })
  elizaLogger.info({ matchingOrder })
  return matchingOrder
}

export const runArbitrage = async (walletClient: EVMWalletClient) => {
  for (const signedOrder of orderbook) {
    const matchingOrder = findMatchingOrder(signedOrder)
    if (!matchingOrder) { continue }

    elizaLogger.info('Found matching order, creating arbitrage orders...')
    await arbitrageOrders(walletClient, signedOrder, matchingOrder)
  }
}

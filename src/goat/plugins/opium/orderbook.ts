import { elizaLogger } from "@elizaos/core"
import assert from "assert"
import { EVMWalletClient } from "@goat-sdk/wallet-evm"

import { SignedOrder } from "./types.ts"
import { getInitialMargin, TOKEN_DECIMALS } from "./helpers.ts"
import { arbitrageOrders } from "./lop.ts"

const orderbook: Array<SignedOrder> = []

export const addOrder = (order: SignedOrder) => {
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
  elizaLogger.info({
    isBuyLong,
    isSellShort,
    isBuyShort,
    isSellLong,
  })

  const isBuying = isBuyLong || isBuyShort
  
  const totalAmount = isBuying ? BigInt(orderStruct.makingAmount) : BigInt(orderStruct.takingAmount)
  const quantity = isBuying ? BigInt(orderStruct.takingAmount) : BigInt(orderStruct.makingAmount)
  
  const isLongPosition = isBuyLong || isSellLong
  const totalMargin = isLongPosition ? 0n : shortMargin * quantity / BigInt(1e18)
  const totalPremium = isLongPosition ? totalAmount : totalMargin - totalAmount
  const premium = totalPremium * BigInt(1e18) / quantity

  const decimals = TOKEN_DECIMALS[derivative.token]
  assert(decimals !== undefined, "Unsupported asset")
    
  elizaLogger.info({
    isBuying,
    isLongPosition,
    totalAmount,
    quantity,
    totalMargin,
    totalPremium,
    premium
  })

  return {
    isBuying, premium, quantity
  }
}

const findMatchingOrder = (leftOrder: SignedOrder): SignedOrder | undefined => {
  const leftOrderParsed = parseOrder(leftOrder)

  return orderbook.find(rightOrder => {
    const rightOrderParsed = parseOrder(rightOrder)

    const isSameDerivative = leftOrder.derivativeHash === rightOrder.derivativeHash
    if (!isSameDerivative) { return false }

    const isMatchingPositions = leftOrderParsed.isBuying !== rightOrderParsed.isBuying
    if (!isMatchingPositions) { return false }

    const buyOrder = leftOrderParsed.isBuying ? leftOrderParsed : rightOrderParsed
    const sellOrder = leftOrderParsed.isBuying ? rightOrderParsed : leftOrderParsed

    const isMatchingPrice = buyOrder.premium >= sellOrder.premium
    if (!isMatchingPrice) { return false }

    const isMatchingQuantity = buyOrder.quantity <= sellOrder.quantity
    if (!isMatchingQuantity) { return false }

    return true
  })
}

const runArbitrage = async (walletClient: EVMWalletClient) => {
  for (const signedOrder of orderbook) {
    const matchingOrder = findMatchingOrder(signedOrder)
    if (!matchingOrder) { continue }

    await arbitrageOrders(walletClient, signedOrder, matchingOrder)
  }
}

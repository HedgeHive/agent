import { elizaLogger } from "@elizaos/core"
import { AmountMode, TakerTraits } from "@1inch/limit-order-sdk"
import { parseUnits } from "viem"
import assert from "assert"

import { Derivative, FillParams, Quote, SignedOrder } from "./types.ts"
import { TOKEN_DECIMALS } from "./helpers.ts"

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

export const findMatchingOrder = (derivative: Derivative, longPositionAddress: string, shortPositionAddress: string, quote: Quote): FillParams | undefined => {
  /**
   * If isBuy is true, we are looking for a sell order, meaning either Buy SHORT position or sell LONG position
   * If isBuy is false, we are looking for a buy order, meaning either Buy LONG position or sell SHORT position
   */
  elizaLogger.info({ derivative, longPositionAddress, shortPositionAddress, quote, orderbook })

  const {
    margin: nominal,
    params: [, collateralization]
  } = derivative
  const initialMargin = nominal * collateralization / BigInt(1e18)

  const signedOrder = orderbook.map(signedOrder => {
    const isBuyLong = signedOrder.orderStruct.takerAsset.toLowerCase() === longPositionAddress.toLowerCase()
    const isSellShort = signedOrder.orderStruct.makerAsset.toLowerCase() === shortPositionAddress.toLowerCase()
    const isBuyShort = signedOrder.orderStruct.takerAsset.toLowerCase() === shortPositionAddress.toLowerCase()
    const isSellLong = signedOrder.orderStruct.makerAsset.toLowerCase() === longPositionAddress.toLowerCase()
    const isMatchingPositions = (quote.isBuy && (isBuyShort || isSellLong)) || (!quote.isBuy && (isBuyLong || isSellShort))
    elizaLogger.info({
      isBuyLong,
      isSellShort,
      isBuyShort,
      isSellLong,
      isMatchingPositions
    })
    if (!isMatchingPositions) { return null }

    const isBuying = isBuyLong || isBuyShort
    const isLongPosition = isBuyLong || isSellLong

    const totalAmount = isBuying ? BigInt(signedOrder.orderStruct.makingAmount) : BigInt(signedOrder.orderStruct.takingAmount)
    const quantity = isBuying ? BigInt(signedOrder.orderStruct.takingAmount) : BigInt(signedOrder.orderStruct.makingAmount)

    const totalMargin = isLongPosition ? 0n : initialMargin * quantity / BigInt(1e18)
    const totalPremium = isLongPosition ? totalAmount : totalMargin - totalAmount
    const premium = totalPremium * BigInt(1e18) / quantity

    const decimals = TOKEN_DECIMALS[derivative.token]
    assert(decimals !== undefined, "Unsupported asset")

    const quotePrice = parseUnits(quote.price.toFixed(decimals), decimals)
    const isMatchingPrice = isBuying ? premium <= quotePrice : premium >= quotePrice
    elizaLogger.info({
      isBuying,
      isLongPosition,
      totalAmount,
      quantity,
      totalMargin,
      totalPremium,
      premium,
      quotePrice,
      isMatchingPrice,
    })
    if (!isMatchingPrice) { return null }

    const quoteQuantity = parseUnits(quote.quantity.toFixed(18), 18)
    const isMatchingQuantity = quoteQuantity <= quantity
    elizaLogger.info({
      quoteQuantity,
      isMatchingQuantity,
    })
    if (!isMatchingQuantity) { return null }

    // TODO: Check if we can use hooks for creation / liquidation of pairs?
    const takerTraits = TakerTraits.default().setAmountMode(isBuying ? AmountMode.taker : AmountMode.maker)

    elizaLogger.info({
      takerTraits
    })

    return {
      signedOrder,
      takerTraits,
      amount: quoteQuantity
    }
  }).find(s => s !== null)

  if (!signedOrder) { return }

  return signedOrder
}

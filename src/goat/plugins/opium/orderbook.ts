import { elizaLogger } from "@elizaos/core"
import { Derivative, SignedOrder } from "./types.ts"

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

export const findMatchingOrder = (derivative: Derivative, longPositionAddress: string, shortPositionAddress: string, isBuy: boolean): SignedOrder | undefined => {
  /**
   * If isBuy is true, we are looking for a sell order, meaning either Buy SHOT position or sell LONG position
   * If isBuy is false, we are looking for a buy order, meaning either Buy LONG position or sell SHORT position
   */
  elizaLogger.info({ derivative, longPositionAddress, shortPositionAddress, isBuy, orderbook })

  // TODO: Implement price matching logic (considering margin)
  return orderbook.find(signedOrder => {
    if (isBuy) {
      return (
        signedOrder.orderStruct.makerAsset.toLowerCase() === longPositionAddress.toLowerCase()
        || signedOrder.orderStruct.takerAsset.toLowerCase() === shortPositionAddress.toLowerCase()
      )
    } else {
      return (
        signedOrder.orderStruct.makerAsset.toLowerCase() === shortPositionAddress.toLowerCase()
        || signedOrder.orderStruct.takerAsset.toLowerCase() === longPositionAddress.toLowerCase()
      )
    }
  })
}

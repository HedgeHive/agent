import { EVMWalletClient } from "@goat-sdk/wallet-evm"
import { Address, LimitOrder, MakerTraits } from "@1inch/limit-order-sdk"

import { OrderParams, SignedOrder } from "./types"

export const createOrder = async (
  wallet: EVMWalletClient,
  orderParams: OrderParams
): Promise<SignedOrder> => {
  const now = ~~(Date.now() / 1000)
  const expiresIn = 120n // 2m
  const expiration = BigInt(now) + expiresIn

  const chainId = wallet.getChain().id
  const maker = wallet.getAddress()

  const makerTraits = MakerTraits.default().withExpiration(expiration)

  const order = new LimitOrder({
    makerAsset: new Address(orderParams.makerAsset),
    takerAsset: new Address(orderParams.takerAsset),
    makingAmount: orderParams.makingAmount,
    takingAmount: orderParams.takingAmount,
    maker: new Address(maker),
  }, makerTraits)

  const orderStruct = order.build()
  const orderHash = order.getOrderHash(chainId)
  const typedData = order.getTypedData(chainId)
  const signature = await wallet.signTypedData(typedData)

  return {
    chainId,
    orderStruct,
    orderHash,
    signature: signature.signature
  }
}

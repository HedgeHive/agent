import { EVMWalletClient } from "@goat-sdk/wallet-evm"
import { Address, AmountMode, Interaction, LimitOrder, LimitOrderContract, MakerTraits, randBigInt, TakerTraits } from "@1inch/limit-order-sdk"
import { elizaLogger } from "@elizaos/core"
import { UINT_40_MAX } from '@1inch/byte-utils'

import { Derivative, OrderParams, SignedOrder } from "./types"
import { encodeDerivative, getDerivativeHash } from "./helpers"
import { ARBITRAGE_ABI } from "./abi"

export const LOP_ADDRESS = '0x111111125421cA6dc452d289314280a0f8842A65'

const ARBITRAGE_CONTRACT_ADDRESS = "0x657c8DBC3dC8D0C3d8cE06fC499D0d4ec8Ff934a"

export const createOrder = async (
  wallet: EVMWalletClient,
  orderParams: OrderParams,
  derivative: Derivative,
  longPositionAddress: string,
  shortPositionAddress: string
): Promise<SignedOrder> => {
  const now = ~~(Date.now() / 1000)
  const expiresIn = 120n // 2m
  const expiration = BigInt(now) + expiresIn

  const chainId = wallet.getChain().id
  const maker = wallet.getAddress()

  const makerTraits = MakerTraits.default()
    .disableMultipleFills()
    .allowPartialFills()
    .withExpiration(expiration)
    .withNonce(randBigInt(UINT_40_MAX))

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
    signature: signature.signature,
    derivative,
    derivativeHash: getDerivativeHash(derivative),
    longPositionAddress,
    shortPositionAddress
  }
}

export const arbitrageOrders = async (
  wallet: EVMWalletClient,
  leftOrder: SignedOrder,
  rightOrder: SignedOrder
) => {
  elizaLogger.info('Creating arbitrage orders...')
  // TODO: Implement other modes: liquidate, swap
  // Create mode
  elizaLogger.info({ leftOrder, rightOrder })
  const quantity = BigInt(leftOrder.orderStruct.takingAmount)
  elizaLogger.info({ quantity })
  const encodedDerivative = encodeDerivative(leftOrder.derivative)
  elizaLogger.info({ encodedDerivative })
  const rightTakerTraits = TakerTraits.default().setAmountMode(AmountMode.taker).setInteraction(
    new Interaction(
      new Address(ARBITRAGE_CONTRACT_ADDRESS),
      '0xff' + encodedDerivative.slice(2)
    )
  )
  elizaLogger.info({ rightTakerTraits })
  const rightOrderFillCalldata = LimitOrderContract.getFillOrderArgsCalldata(
    rightOrder.orderStruct,
    rightOrder.signature,
    rightTakerTraits,
    quantity
  )

  const leftTakerTraits = TakerTraits.default().setAmountMode(AmountMode.taker).setInteraction(
    new Interaction(
      new Address(ARBITRAGE_CONTRACT_ADDRESS),
      rightOrderFillCalldata
    )
  )
  elizaLogger.info({ leftTakerTraits })
  const calldata = LimitOrderContract.getFillOrderArgsCalldata(
    leftOrder.orderStruct,
    leftOrder.signature,
    leftTakerTraits,
    quantity
  )
  elizaLogger.info({ calldata })

  elizaLogger.info('Sending arbitrage transaction...')
  const tx = await wallet.sendTransaction({
    to: ARBITRAGE_CONTRACT_ADDRESS,
    abi: ARBITRAGE_ABI,
    functionName: 'create',
    args: [calldata]
  })

  return tx
}

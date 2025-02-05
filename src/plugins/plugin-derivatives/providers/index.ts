/** Providers */

import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core"

import { getDeribitSingleton } from '../services/deribit-api/index.ts'

// IndexPricesProvider
export const AvailableUnderlyingAssetsProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    return `Available underlying assets:
\t- ETH`
  }
}

export const IndexPricesProvider: Provider = {
  get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    const deribit = getDeribitSingleton()
    const indexPrice = await deribit.getIndexPrice('eth_usd')
    return `Current index prices:
\t- ETH/USD: ${indexPrice}`
  }
}

import { type Chain, createTool, PluginBase } from "@goat-sdk/core";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";
import { z } from "zod";
import assert from 'assert'
import { elizaLogger } from "@elizaos/core";

import { createOrder, fillOrder } from "./lop.ts";
import { getFillParams, getOrderParams, getPositionAddress, isChainIdSupported, parseDerivative } from "./helpers.ts";
import { addOrder, findMatchingOrder, removeOrder } from "./orderbook.ts";
import { PositionType } from "./types.ts";

export type OpiumPluginParams = {}
export class OpiumPlugin extends PluginBase {
    constructor(readonly params: OpiumPluginParams) {
        super("opium", []);
    }

    supportsChain = (chain: Chain) => chain.type === "evm" && isChainIdSupported(chain.id)

    getTools(walletClient: EVMWalletClient) {
        return [
            createTool(
                {
                    name: "place_order",
                    description: "Place and order to the orderbook with provided instrument name, quantity, side (buy / sell) and price",
                    parameters: z.object({
                        instrumentName: z.string({ description: "Instrument name in format <ASSET>-<DMMMYY>-<STRIKE>-<C|P>" }),
                        quantity: z.number(),
                        side: z.string({ description: "BUY or SELL" }),
                        price: z.number()
                    }),
                },
                async (parameters) => {
                    elizaLogger.info({ parameters })

                    assert(parameters.instrumentName !== undefined, "Instrument name is required");
                    assert(parameters.quantity !== undefined, "Quantity is required");
                    assert(parameters.side !== undefined, "Side is required");
                    assert(parameters.price !== undefined, "Price is required");
                    assert(parameters.side === "BUY" || parameters.side === "SELL", "Side must be either BUY or SELL");

                    const derivative = parseDerivative(parameters.instrumentName);
                    const longPositionAddress = getPositionAddress(derivative, PositionType.LONG);
                    const shortPositionAddress = getPositionAddress(derivative, PositionType.SHORT);

                    const isBuy = parameters.side === "BUY";

                    const matchingOrder = findMatchingOrder(derivative, longPositionAddress, shortPositionAddress, isBuy);

                    if (!matchingOrder) {
                        const orderParams = getOrderParams(derivative, longPositionAddress, shortPositionAddress, isBuy)
                        const signedOrder = await createOrder(walletClient, orderParams)
                        addOrder(signedOrder)
                        return {
                            text: `No matching orders were found. New order was placed instead, orderHash=${signedOrder.orderHash}`,
                            data: {
                                orderHash: signedOrder.orderHash,
                            }
                        };
                    }

                    const fillParams = getFillParams()
                    await fillOrder(walletClient, matchingOrder, fillParams)
                    removeOrder(matchingOrder.orderHash)
                    return {
                        text: `Matching order was found and filled successfully`
                    }
                },
            ),
        ];
    }
}

export const opium = (params: OpiumPluginParams) => new OpiumPlugin(params);

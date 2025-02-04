import { type Chain, createTool, PluginBase, WalletClientBase } from "@goat-sdk/core";
import { arbitrum } from "viem/chains";
import { z } from "zod";
import { keccak256 } from "viem";
import assert from 'assert'
import moment from 'moment'

export type Derivative = {
    margin: BigInt;
    endTime: number;
    params: BigInt[];
    oracleId: string;
    token: string;
    syntheticId: string;
};

const SUPPORTED_ASSETS = ['ETH']
const UNDERLYING_ADDRESS_BY_ASSET = {
    'ETH': '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}
const ORACLE_ADDRESS_BY_ASSET = {
    'ETH': '0xAF5F031b8D5F12AD80d5E5f13C99249d82AfFfe2',
}
const SYNTHETIC_ADDRESS_BY_TYPE = {
    "C": "0x61EFdF8c52b49A347E69dEe7A62e0921A3545cF7",
    "P": "0x6E797659154AD0D6f199feaFA2E2086Ce0239Fbf"
}

// Example: ETH-28FEB25-4000-C
const parseDerivative = (instrumentName: string): Derivative => {
    const [UNDERLYING_ASSET, MATURITY, STRIKE_PRICE, TYPE] = instrumentName.split("-");

    assert(UNDERLYING_ASSET && MATURITY && STRIKE_PRICE && TYPE, "Invalid instrument name");
    assert(SUPPORTED_ASSETS.includes(UNDERLYING_ASSET), "Unsupported asset");
    assert(TYPE === "C" || TYPE === "P", "Invalid option type");

    const margin = BigInt(1e18);
    const endTime = moment(MATURITY, "DDMMMYY").unix()
    const strikePrice = BigInt(STRIKE_PRICE) * BigInt(1e18)
    const oracleId = ORACLE_ADDRESS_BY_ASSET[UNDERLYING_ASSET]
    const token = UNDERLYING_ADDRESS_BY_ASSET[UNDERLYING_ASSET]
    const syntheticId = SYNTHETIC_ADDRESS_BY_TYPE[TYPE]

    return {
        margin,
        endTime: endTime,
        params: [strikePrice],
        oracleId,
        token,
        syntheticId
    }
}

// TODO: Implement
const getDerivativeAddress = (derivative: Derivative, isLong: boolean) => {
    const position = isLong ? "LONG" : "SHORT";
    const bytes = new TextEncoder().encode(`${derivative.token}-${derivative.endTime}-${derivative.params}-${derivative.oracleId}-${derivative.syntheticId}-${position}`);
    return keccak256(bytes)
}

type Order = {
    makerAsset: string
    takerAsset: string
}
type OrderInfo = {
    orderHash: string
    order: Order
}
const orderbook: Array<OrderInfo> = []

const findMatchingOrder = (derivative: Derivative, longPositionAddress: string, shortPositionAddress: string, isBuy: boolean): OrderInfo | undefined => {
    /**
     * If isBuy is true, we are looking for a sell order, meaning either Buy SHOT position or sell LONG position
     * If isBuy is false, we are looking for a buy order, meaning either Buy LONG position or sell SHORT position
     */

    // TODO: Implement price matching logic (considering margin)
    return orderbook.find(orderDetail => {
        if (isBuy) {
            return orderDetail.order.makerAsset === shortPositionAddress || orderDetail.order.takerAsset === longPositionAddress
        } else {
            return orderDetail.order.makerAsset === longPositionAddress || orderDetail.order.takerAsset === shortPositionAddress
        }
    })
}

const hashOrder = (order: Order) => {
    return keccak256(new TextEncoder().encode(JSON.stringify(order)))
}

const SUPPORTED_CHAINS = [arbitrum];

export type OpiumPluginParams = {}

export class OpiumPlugin extends PluginBase {
    constructor(readonly params: OpiumPluginParams) {
        super("opium", []);
    }

    supportsChain = (chain: Chain) => chain.type === "evm" && SUPPORTED_CHAINS.some((c) => c.id === chain.id);


    getTools(walletClient: WalletClientBase) {
        return [
            createTool(
                {
                    name: "place_order",
                    description: "Place and order to the orderbook with provided instrument name, quantity, side (buy / sell) and price",
                    parameters: z.object({
                        instrumentName: z.string({ description: "Instrument name in format <ASSET>-<DDMMMYY>-<STRIKE>-<C|P>" }),
                        quantity: z.number(),
                        side: z.string({ description: "BUY or SELL"}),
                        price: z.number()
                    }),
                },
                async (parameters) => {
                    assert(parameters.instrumentName !== undefined, "Instrument name is required");
                    assert(parameters.quantity !== undefined, "Quantity is required");
                    assert(parameters.side !== undefined, "Side is required");
                    assert(parameters.price !== undefined, "Price is required");
                    assert(parameters.side === "BUY" || parameters.side === "SELL", "Side must be either BUY or SELL");

                    const derivative = parseDerivative(parameters.instrumentName);
                    const longPositionAddress = getDerivativeAddress(derivative, true);
                    const shortPositionAddress = getDerivativeAddress(derivative, false);

                    const isBuy = parameters.side === "BUY";

                    const matchingOrder = findMatchingOrder(derivative, longPositionAddress, shortPositionAddress, isBuy);

                    if (!matchingOrder) {
                        const order: Order = {
                            makerAsset: derivative.token,
                            takerAsset: isBuy ? longPositionAddress : shortPositionAddress
                        }
                        const orderHash = hashOrder(order)
                        orderbook.push({
                            orderHash,
                            order
                        })
                        return {
                            text: `Order placed successfully, orderHash=${orderHash}`,
                            data: { orderHash }
                        };
                    }

                    // TODO: Fill order logic

                    return {
                        text: `Order filled successfully`
                    }
                },
            ),
        ];
    }
}

export const opium = (params: OpiumPluginParams) => new OpiumPlugin(params);

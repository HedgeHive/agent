import { arbitrum } from "viem/chains";
import assert from "assert";
import moment from "moment";
import { keccak256 } from "viem";
import { AmountMode } from "@1inch/limit-order-sdk";

import { Derivative, FillParams, OrderParams, PositionType } from "./types.ts";

const SUPPORTED_CHAINS = [arbitrum];
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

export const isChainIdSupported = (chainId: number): boolean => {
  return SUPPORTED_CHAINS.some(chain => chain.id === chainId);
}

export const getOrderParams = (derivative: Derivative, longPositionAddress: string, shortPositionAddress: string, isBuy: boolean): OrderParams => {
  // TODO: Check if users has opposite position and if so, liquidate it, otherwise get a new one

  return {
    makerAsset: derivative.token,
    takerAsset: isBuy ? longPositionAddress : shortPositionAddress,
    makingAmount: 1n,
    takingAmount: 1n
  }
}

export const getFillParams = (): FillParams => {
  return {
    amountMode: AmountMode.maker,
    amount: 1n
  }
}

/**
 * 
 * @param {string} instrumentName - The instrument name in the format of "UNDERLYING_ASSET-MATURITY-STRIKE_PRICE-TYPE"
 * @returns {Derivative} - The derivative object
 */
export const parseDerivative = (instrumentName: string): Derivative => {
  const [UNDERLYING_ASSET, MATURITY, STRIKE_PRICE, TYPE] = instrumentName.split("-");

  assert(UNDERLYING_ASSET && MATURITY && STRIKE_PRICE && TYPE, "Invalid instrument name");
  assert(SUPPORTED_ASSETS.includes(UNDERLYING_ASSET), "Unsupported asset");
  assert(TYPE === "C" || TYPE === "P", "Invalid option type");

  const margin = BigInt(1e18);
  const endTime = moment.utc(MATURITY, "DMMMYY").hour(8).minute(0).second(0).unix()
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
export const getPositionAddress = (derivative: Derivative, positionType: PositionType) => {
  const bytes = new TextEncoder().encode(`${derivative.token}-${derivative.endTime}-${derivative.params}-${derivative.oracleId}-${derivative.syntheticId}-${positionType}`);
  return keccak256(bytes).substring(0, 42);
}

import { arbitrum } from "viem/chains";
import assert from "assert";
import moment from "moment";
import { keccak256, getCreate2Address, encodePacked, parseUnits } from "viem";
import { EVMWalletClient } from "@goat-sdk/wallet-evm";

import { Derivative, OrderParams, PositionType, Quote } from "./types.ts";
import { ERC20_ABI, FAUCET_ABI } from "./abi.ts";
import { LOP_ADDRESS } from "./lop.ts";

const SUPPORTED_CHAINS = [arbitrum];
const SUPPORTED_ASSETS = ['ETH']
const COLLATERALIZATION_PERCENT = 100n
const OPIUM_POSITION_IMPLEMENTATION_ADDRESS = '0x6384F8070fda183e2b8CE0d521C0a9E7606e30EA'
const OPIUM_POSITION_FACTORY_ADDRESS = '0x328bC74ccA6578349B262D21563d5581DAA43a16'
const UNDERLYING_ADDRESS_BY_ASSET = {
  'ETH': '0xaab14767959b8b3a3710eee8f4124aad22faceaf', // Mock WETH
}
export const TOKEN_DECIMALS = {
  '0xaab14767959b8b3a3710eee8f4124aad22faceaf': 18
}
const TOKEN_FAUCET_ADDRESS = {
  '0xaab14767959b8b3a3710eee8f4124aad22faceaf': '0xe848bb034CC9CBBe610Ed484F5b2593444df111e'
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

export const getInitialMargin = (derivative: Derivative) => {
  const {
    margin: nominal,
    params: [, collateralization]
  } = derivative
  return {
    longMargin: 0n,
    shortMargin: nominal * collateralization / BigInt(1e18),
  }
}

const getTotalToPay = (derivative: Derivative, quote: Quote) => {
  const decimals = TOKEN_DECIMALS[derivative.token]
  assert(decimals !== undefined, "Unsupported asset")

  const { shortMargin } = getInitialMargin(derivative)

  const quantity = parseUnits(quote.quantity.toFixed(18), 18)
  const price = parseUnits(quote.price.toFixed(decimals), decimals)

  const totalMargin = shortMargin * quantity / BigInt(1e18)
  const totalPremium = price * quantity / BigInt(1e18)

  return quote.isBuy ? totalPremium : totalMargin - totalPremium
}

export const performBalanceAndAllowanceChecks = async (walletClient: EVMWalletClient, derivative: Derivative, quote: Quote) => {
  const decimals = TOKEN_DECIMALS[derivative.token]
  assert(decimals !== undefined, "Unsupported asset")

  const totalToPay = getTotalToPay(derivative, quote)

  const [rawBalance, rawAllowance] = await Promise.all([
    walletClient.read({
      address: derivative.token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [walletClient.getAddress()],
    }),
    walletClient.read({
      address: derivative.token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [walletClient.getAddress(), LOP_ADDRESS]
    })
  ])

  const balance = rawBalance.value as bigint
  const allowance = rawAllowance.value as bigint

  if (balance < totalToPay) {
    await walletClient.sendTransaction({
      to: TOKEN_FAUCET_ADDRESS[derivative.token],
      abi: FAUCET_ABI,
      functionName: "claim",
      args: []
    })
  }

  if (allowance < totalToPay) {
    await walletClient.sendTransaction({
      to: derivative.token,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [LOP_ADDRESS, totalToPay]
    })
  }
}

export const getOrderParams = (derivative: Derivative, longPositionAddress: string, shortPositionAddress: string, quote: Quote): OrderParams => {
  // TODO: [LATER] Check if users has opposite position and if so, liquidate it, otherwise get a new one

  const quantity = parseUnits(quote.quantity.toFixed(18), 18)
  const totalToPay = getTotalToPay(derivative, quote)
  return {
    makerAsset: derivative.token,
    takerAsset: quote.isBuy ? longPositionAddress : shortPositionAddress,
    makingAmount: totalToPay,
    takingAmount: quantity
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

  const nominal = BigInt(1e18);
  const endTime = moment.utc(MATURITY, "DMMMYY").hour(8).minute(0).second(0).unix()
  const strikePrice = BigInt(STRIKE_PRICE) * BigInt(1e18)
  const collateralization = BigInt(1e18) * COLLATERALIZATION_PERCENT / 100n
  const fixedPremium = 0n
  const oracleId = ORACLE_ADDRESS_BY_ASSET[UNDERLYING_ASSET]
  const token = UNDERLYING_ADDRESS_BY_ASSET[UNDERLYING_ASSET]
  const syntheticId = SYNTHETIC_ADDRESS_BY_TYPE[TYPE]

  return {
    margin: nominal,
    endTime: endTime,
    params: [strikePrice, collateralization, fixedPremium],
    oracleId,
    token,
    syntheticId
  }
}

export const getDerivativeHash = (derivative: Derivative): `0x${string}` => {
  return keccak256(
    encodePacked(
      ['uint256', 'uint256', 'uint256[]', 'address', 'address', 'address'],
      [
        derivative.margin,
        BigInt(derivative.endTime),
        derivative.params,
        derivative.oracleId as `0x${string}`,
        derivative.token as `0x${string}`,
        derivative.syntheticId as `0x${string}`,
      ]
    )
  )
}

const stripHexPrefix = (str: string) => {
  return str.replace(/^(-)?0x/i, '$1')
}

export const getPositionAddress = (derivative: Derivative, positionType: PositionType) => {
  const derivativeHash = getDerivativeHash(derivative)
  const salt = keccak256(
    encodePacked(
      ['bytes32', 'string'],
      [
        derivativeHash,
        positionType === PositionType.LONG ? 'L' : 'S'
      ]
    )
  )

  const implementation = stripHexPrefix(OPIUM_POSITION_IMPLEMENTATION_ADDRESS.toLowerCase()).padStart(40, "0");
  const initCode = `0x3d602d80600a3d3981f3363d3d373d3d3d363d73${implementation}5af43d82803e903d91602b57fd5bf3` as `0x${string}`;
  const initCodeHash = keccak256(initCode);

  return getCreate2Address({
    from: OPIUM_POSITION_FACTORY_ADDRESS,
    salt,
    bytecodeHash: initCodeHash
  })
}

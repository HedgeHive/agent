import { AmountMode, LimitOrderV4Struct } from "@1inch/limit-order-sdk";

export type Derivative = {
  margin: bigint;
  endTime: number;
  params: bigint[];
  oracleId: string;
  token: string;
  syntheticId: string;
}

export enum PositionType {
  LONG,
  SHORT
}

export type OrderParams = {
  makerAsset: string
  takerAsset: string
  makingAmount: bigint
  takingAmount: bigint
}

export type SignedOrder = {
  chainId: number
  orderStruct: LimitOrderV4Struct
  orderHash: string
  signature: string
}

export type FillParams = {
  amountMode: AmountMode
  amount: bigint
}

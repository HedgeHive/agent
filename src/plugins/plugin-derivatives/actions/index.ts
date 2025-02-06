import { createTool } from "@goat-sdk/core";
import { z } from "zod";
import assert from 'assert';
import { elizaLogger } from "@elizaos/core";

import { createAction } from "../../../goat/adapters/eliza.ts";
import { getDeribitSingleton } from "../services/deribit-api/index.ts";
import { DeribitCurrency } from "../services/deribit-api/types.ts";

const getActiveInstruments = async (underlyingAsset: DeribitCurrency) => {
  const deribit = getDeribitSingleton();
  const instruments = await deribit.getInstruments(underlyingAsset, 'option', false);
  return instruments.filter(i => i.is_active);
}

const assertAndParseUnderlyingAsset = (underlyingAsset: string) => {
  assert(underlyingAsset, "Underlying asset is required")
  if (underlyingAsset !== 'any') {
    underlyingAsset = underlyingAsset.toUpperCase()
  }
  return underlyingAsset as DeribitCurrency
}

const assertAndParseInstrumentName = (instrumentName: string) => {
  assert(instrumentName, "Instrument name is required")
  instrumentName = instrumentName.toUpperCase()
  return instrumentName
}

export const CheckIfOptionIsAvailable = createAction(createTool(
  {
    name: "check_if_option_is_available",
    description: "Checks the availability of the option for a given instrument <ASSET>-<DMMMYY>-<STRIKE>-<C|P>. It's useful to check option availability before doing anything with it",
    parameters: z.object({
      instrumentName: z.string({ description: "Instrument name in format <ASSET>-<DMMMYY>-<STRIKE>-<C|P>" }),
      underlyingAsset: z.string({ description: "Underlying asset ('BTC' | 'ETH' | 'USDC' | 'USDT' | 'EURR' | 'any')" }),
    }),
  },
  async (parameters) => {
    elizaLogger.info({ parameters })

    const instrumentName = assertAndParseInstrumentName(parameters.instrumentName)
    const underlyingAsset = assertAndParseUnderlyingAsset(parameters.underlyingAsset)

    const activeInstruments = await getActiveInstruments(underlyingAsset)
    return activeInstruments.map(i => i.instrument_name).includes(instrumentName)
  }
))

export const GetAvailableOptions = createAction(createTool(
  {
    name: "get_available_options",
    description: "Get the list of available options for a given underlying asset",
    parameters: z.object({
      underlyingAsset: z.string({ description: "Underlying asset ('BTC' | 'ETH' | 'USDC' | 'USDT' | 'EURR' | 'any')" }),
    }),
  },
  async (parameters) => {
    elizaLogger.info({ parameters })

    const underlyingAsset = assertAndParseUnderlyingAsset(parameters.underlyingAsset)

    const activeInstruments = await getActiveInstruments(underlyingAsset)
    return activeInstruments.map(i => i.instrument_name);
  }
))

export const GetOptionPriceAction = createAction(createTool(
  {
    name: "get_option_price",
    description: "Get the market price of the given option instrument <ASSET>-<DMMMYY>-<STRIKE>-<C|P>",
    parameters: z.object({
      instrumentName: z.string({ description: "Instrument name in format <ASSET>-<DMMMYY>-<STRIKE>-<C|P>" })
    }),
  },
  async (parameters) => {
    elizaLogger.info({ parameters })

    const instrumentName = assertAndParseInstrumentName(parameters.instrumentName)

    const deribit = getDeribitSingleton();
    const instrumentSummary = await deribit.getBookSummaryByInstrument(instrumentName)

    elizaLogger.info({ instrumentSummary })

    return instrumentSummary.mark_price
  }
))

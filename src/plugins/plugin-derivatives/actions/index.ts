import { createTool } from "@goat-sdk/core";
import { z } from "zod";
import assert from 'assert';
import { elizaLogger } from "@elizaos/core";

import { createAction } from "../../../goat/adapters/eliza.ts";
import { getDeribitSingleton } from "../services/deribit-api/index.ts";
import { DeribitCurrency } from "../services/deribit-api/types.ts";

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
    assert(parameters.underlyingAsset, "Underlying asset is required")

    let underlyingAsset = parameters.underlyingAsset
    if (underlyingAsset !== 'any') {
      underlyingAsset = underlyingAsset.toUpperCase()
    }

    const deribit = getDeribitSingleton();
    const instruments = await deribit.getInstruments(underlyingAsset as DeribitCurrency, 'option', false);
    return instruments.map(i => i.instrument_name && i.is_active);
  }
))

export const GetOptionPriceAction = createAction(createTool(
  {
    name: "get_option_price",
    description: "Get the market price of the given option instrument <ASSET>-<DDMMMYY>-<STRIKE>-<C|P>",
    parameters: z.object({
      instrumentName: z.string({ description: "Instrument name in format <ASSET>-<DDMMMYY>-<STRIKE>-<C|P>" }),
    }),
  },
  async (parameters) => {
    elizaLogger.info({ parameters })
    assert(parameters.instrumentName, "Instrument name is required")

    const instrumentName = parameters.instrumentName.toUpperCase()

    const deribit = getDeribitSingleton();
    const instrumentSummary = await deribit.getBookSummaryByInstrument(instrumentName)
    return instrumentSummary.mark_price
  }
))

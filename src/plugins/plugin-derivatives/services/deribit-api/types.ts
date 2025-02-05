export type DeribitAuthCredentials = {
  client_id: string
  client_secret: string
}

export type DeribitAuthData = {
  access_token: string
  expires_in: number
  refresh_token: string
  issued_at: number
}

export type DeribitInstrument = {
  tick_size: number
  tick_size_steps: { above_price: number; tick_size: number }[]
  taker_commission: number
  settlement_period: string
  settlement_currency: string
  rfq: boolean
  quote_currency: string
  price_index: string
  min_trade_amount: number
  max_liquidation_commission: number
  max_leverage: number
  maker_commission: number
  kind: string
  is_active: boolean
  instrument_name: string
  instrument_id: number
  instrument_type: string
  expiration_timestamp: number
  creation_timestamp: number
  counter_currency: string
  contract_size: number
  block_trade_tick_size: number
  block_trade_min_trade_amount: number
  block_trade_commission: number
  base_currency: string
  future_type?: string
  option_type?: string
  strike?: number
}

export type DeribitPriceAmount = [number, number]

interface DeribitGreeks {
  delta: number
  gamma: number
  rho: number
  theta: number
  vega: number
}

interface DeribitStats {
  high: number
  low: number
  price_change: number
  volume: number
  volume_usd: number
}

export type DeribitOrderbook = {
  ask_iv?: number // (Only for option) implied volatility for best ask
  asks: DeribitPriceAmount[]
  best_ask_amount: number
  best_ask_price: number | null
  best_bid_amount: number
  best_bid_price: number | null
  bid_iv?: number // (Only for option) implied volatility for best bid
  bids: DeribitPriceAmount[]
  current_funding?: number // (perpetual only)
  delivery_price?: number // Only when state = closed
  funding_8h?: number // (perpetual only)
  greeks?: DeribitGreeks // Only for options
  index_price: number
  instrument_name: string
  interest_rate?: number // (options only)
  last_price: number
  mark_iv?: number // (Only for option) implied volatility for mark price
  mark_price: number
  max_price: number
  min_price: number
  open_interest: number
  settlement_price?: number // Optional (not added for spot). Only when state = open
  state: string // Possible values are open and closed
  stats: DeribitStats
  timestamp: number
  underlying_index?: number // (options only)
  underlying_price?: number // (options only)
}

export type DeribitPosition = {
  average_price: number
  average_price_usd?: number // Only for options
  delta: number
  direction: DeribitDirection
  estimated_liquidation_price?: number // Only for futures, for non-portfolio margining users
  floating_profit_loss: number
  floating_profit_loss_usd?: number // Only for options
  gamma?: number // Only for options
  index_price: number
  initial_margin: number
  instrument_name: string
  interest_value?: number // Perpetual only
  kind: DeribitKind
  leverage: number
  maintenance_margin: number
  mark_price: number
  open_orders_margin: number
  realized_funding?: number // Only for positions of perpetual instruments
  realized_profit_loss: number
  settlement_price?: number // Optional (not added for spot). 0 if instrument wasn't settled yet
  size: number
  size_currency?: number // Only for futures
  theta?: number // Only for options
  total_profit_loss: number
  vega?: number // Only for options
}

export type DeribitTrades = {
  instrument_name: string
  amount?: number
  direction: DeribitDirectionTrade
}

export type DeribitLeg = {
  amount: number // Size multiplier of a leg. A negative value indicates opposite direction to the combo trades they originate from
  instrument_name: string // Unique instrument identifier
}

export type DeribitCombo = {
  creation_timestamp: number // The timestamp (milliseconds since the Unix epoch)
  id: string // Unique combo identifier
  instrument_id: number // Instrument ID
  legs: DeribitLeg[] // Array of leg objects
  state: 'rfq' | 'active' | 'inactive' // Combo state
  state_timestamp: number // The timestamp (milliseconds since the Unix epoch)
}

export type DeribitOtoCoConfig = {
  amount?: number // Optional
  direction: 'buy' | 'sell' // Required
  type?: DeribitOrderType // Optional, default: "limit"
  label?: string // Optional, max 64 characters
  price?: number // Optional
  reduce_only?: boolean // Optional
  time_in_force?: DeribitTimeInForce // Optional, default: "good_til_cancelled"
  post_only?: boolean // Optional
  reject_post_only?: boolean // Optional
  trigger_price?: number // Optional
  trigger_offset?: number // Optional
  trigger?: DeribitTriggerType // Optional
}

export type DeribitOrderParameters = {
  instrument_name: string // Required
  amount?: number // Optional
  contracts?: number // Optional
  type?: DeribitOrderType // Optional, default: "limit"
  label?: string // Optional, max 64 characters
  price?: number // Optional
  time_in_force?: DeribitTimeInForce // Optional, default: "good_til_cancelled"
  max_show?: number // Optional
  post_only?: boolean // Optional
  reject_post_only?: boolean // Optional
  reduce_only?: boolean // Optional
  trigger_price?: number // Optional
  trigger_offset?: number // Optional
  trigger?: DeribitTriggerType // Optional
  advanced?: DeribitAdvancedOptionType // Optional
  mmp?: boolean // Optional
  valid_until?: number // Optional, timestamp in milliseconds
  linked_order_type?: DeribitLinkedOrderType // Optional
  trigger_fill_condition?: DeribitTriggerFillCondition // Optional, default: "first_hit"
  otoco_config?: DeribitOtoCoConfig[] // Optional, array of trade configurations
}

export type DeribitOrderState = 'open' | 'filled' | 'rejected' | 'cancelled' | 'untriggered'

export type DeribitOrder = {
  reject_post_only?: boolean // Field is present only when post_only is true
  label: string // User defined label (up to 64 characters)
  quote_id: string // The same QuoteID as supplied in the private/mass_quote request.
  order_state: DeribitOrderState // Order state
  is_secondary_oto?: boolean // true if the order is an order that can be triggered by another order
  usd?: number // Option price in USD (Only if advanced="usd")
  implv?: number // Implied volatility in percent (Only if advanced="implv")
  trigger_reference_price?: number // The price of the given trigger at the time when the order was placed (Only for trailing trigger orders)
  original_order_type?: string // Original order type (Optional field)
  oco_ref?: string // Unique reference that identifies a one_cancels_others (OCO) pair.
  block_trade?: boolean // true if order made from block_trade trade, added only in that case
  trigger_price?: number // Trigger price (Only for future trigger orders)
  api: boolean // true if created with API
  mmp: boolean // true if the order is a MMP order, otherwise false
  oto_order_ids?: string[] // The Ids of the orders that will be triggered if the order is filled
  trigger_order_id?: string // Id of the trigger order that created the order (Only for orders that were created by triggered orders)
  cancel_reason?:
    | 'user_request'
    | 'autoliquidation'
    | 'cancel_on_disconnect'
    | 'risk_mitigation'
    | 'pme_risk_reduction'
    | 'pme_account_locked'
    | 'position_locked'
    | 'mmp_trigger'
    | 'mmp_config_curtailment'
    | 'edit_post_only_reject'
    | 'oco_other_closed'
    | 'oto_primary_closed'
    | 'settlement' // Enumerated reason behind cancel
  primary_order_id: string // Unique order identifier
  quote?: boolean // If order is a quote (Present only if true)
  risk_reducing: boolean // true if the order is marked by the platform as a risk reducing order
  filled_amount: number // Filled amount of the order
  instrument_name: string // Unique instrument identifier
  max_show: number // Maximum amount within an order to be shown to other traders
  app_name?: string // The name of the application that placed the order on behalf of the user (optional)
  mmp_cancelled?: boolean // true if order was cancelled by mmp trigger (optional)
  direction: 'buy' | 'sell' // Direction of the order
  last_update_timestamp: number // The timestamp (milliseconds since the Unix epoch)
  trigger_offset?: number // The maximum deviation from the price peak beyond which the order will be triggered (Only for trailing trigger orders)
  mmp_group?: string // Name of the MMP group supplied in the private/mass_quote request
  price: number | 'market_price' // Price in base currency or "market_price" in case of open trigger market orders
  is_liquidation?: boolean // true if order was automatically created during liquidation
  reduce_only?: boolean // 'true for reduce-only orders only'
  amount: number // It represents the requested order size
  is_primary_otoco?: boolean // true if the order is an order that can trigger an OCO pair
  post_only: boolean // true for post-only orders only
  mobile?: boolean // optional field with value true added only when created with Mobile Application
  trigger_fill_condition?: 'first_hit' | 'complete_fill' | 'incremental' // The fill condition of the linked order (Only for linked order types)
  triggered: boolean // Whether the trigger order has been triggered
  order_id: string // Unique order identifier
  replaced: boolean // true if the order was edited
  order_type: 'limit' | 'market' | 'stop_limit' | 'stop_market' // Order type
  time_in_force: 'good_til_cancelled' | 'good_til_day' | 'fill_or_kill' | 'immediate_or_cancel' // Order time in force
  auto_replaced?: boolean // true if last modification of the order was performed by the pricing engine (optional)
  quote_set_id?: string // Identifier of the QuoteSet supplied in the private/mass_quote request
  contracts?: number // Order size in contract units (Optional)
  trigger?: 'index_price' | 'mark_price' | 'last_price' // Trigger type (only for trigger orders)
  web?: boolean // true if created via Deribit frontend (optional)
  creation_timestamp: number // The timestamp (milliseconds since the Unix epoch)
  is_rebalance?: boolean // true if order was automatically created during cross-collateral balance restoration (optional)
  average_price: number // Average fill price of the order
  advanced?: 'usd' | 'implv' // advanced type: "usd" or "implv" (Only for options)
}

export type DeribitTrade = {
  timestamp: number // The timestamp of the trade (milliseconds since the UNIX epoch)
  label?: string // User defined label (presented only when previously set for order by user)
  fee: number // User's fee in units of the specified fee_currency
  quote_id?: string // QuoteID of the user order (optional, present only for orders placed with private/mass_quote)
  liquidity: 'M' | 'T' // Describes what was role of users order: "M" when it was maker order, "T" when it was taker order
  index_price: number // Index Price at the moment of trade
  api: boolean // true if user order was created with API
  mmp: boolean // true if user order is MMP
  legs?: any[] // Optional field containing leg trades if trade is a combo trade
  trade_seq: number // The sequence number of the trade within instrument
  risk_reducing: boolean // true if user order is marked by the platform as a risk reducing order
  instrument_name: string // Unique instrument identifier
  fee_currency: string // Currency, i.e "BTC", "ETH", "USDC"
  direction: 'buy' | 'sell' // Direction of the trade
  trade_id: string // Unique (per currency) trade identifier
  tick_direction: 0 | 1 | 2 | 3 // Direction of the "tick"
  profit_loss: number // Profit and loss in base currency
  matching_id: any // Always null
  price: number // Price in base currency
  reduce_only: string // true if user order is reduce-only
  amount: number // Trade amount
  post_only: string // true if user order is post-only
  liquidation?: 'M' | 'T' | 'MT' // Optional field (only for trades caused by liquidation)
  combo_trade_id?: number // Optional field containing combo trade identifier if the trade is a combo trade
  order_id: string // Id of the user order
  block_trade_id?: string // Block trade id
  order_type: 'limit' | 'market' | 'liquidation' // Order type
  quote_set_id?: string // QuoteSet of the user order (optional, present only for orders placed with private/mass_quote)
  combo_id?: string // Optional field containing combo instrument name if the trade is a combo trade
  underlying_price?: number // Underlying price for implied volatility calculations (Options only)
  contracts?: number // Trade size in contract units (optional)
  mark_price: number // Mark Price at the moment of trade
  iv?: number // Option implied volatility for the price (Option only)
  state: DeribitOrderState | 'archive' // Order state
  advanced?: 'usd' | 'implv' // Advanced type of user order (Only for options)
}

interface DeribitFee {
  currency: string // The currency the fee applies to
  fee_type: 'relative' | 'fixed' // Fee type
  instrument_type: 'future' | 'perpetual' | 'option' // Type of the instruments the fee applies to
  maker_fee: number // User fee as a maker
  taker_fee: number // User fee as a taker
}

interface DeribitLimits {
  // Define this interface based on the separate document
}

interface DeribitOptionsMap {
  [index: string]: number // Map of options' gammas, vegas, or thetas per index
}

export type DeribitAccountSummary = {
  maintenance_margin: number // The maintenance margin
  delta_total: number // The sum of position deltas
  id?: number // Account id (available when parameter extended = true)
  options_session_rpl: number // Options session realized profit and Loss
  self_trading_reject_mode?: 'reject_taker' | 'cancel_maker' // Self trading rejection behavior
  futures_session_rpl: number // Futures session realized profit and Loss
  session_upl: number // Session unrealized profit and loss
  fee_balance: number // The account's fee balance
  fees?: DeribitFee[] // User fees in case of any discounts
  limits?: DeribitLimits // Limits object (defined in a separate document)
  type?: string // Account type (available when parameter extended = true)
  initial_margin: number // The account's initial margin
  options_gamma_map?: DeribitOptionsMap // Map of options' gammas per index
  futures_pl: number // Futures profit and Loss
  currency: string // The selected currency
  options_value: number // Options value
  security_keys_enabled?: boolean // Whether Security Key authentication is enabled
  self_trading_extended_to_subaccounts?: string // Self trading rejection behavior extended to subaccounts
  projected_maintenance_margin: number // Projected maintenance margin
  options_vega: number // Options summary vega
  session_rpl: number // Session realized profit and loss
  has_non_block_chain_equity?: boolean // Whether user has non block chain equity
  system_name?: string // System generated user nickname
  deposit_address?: string // The deposit address for the account
  total_initial_margin_usd?: number // The account's total initial margin in USD
  futures_session_upl: number // Futures session unrealized profit and Loss
  options_session_upl: number // Options session unrealized profit and Loss
  referrer_id?: string // Optional identifier of the referrer
  cross_collateral_enabled: boolean // When true cross collateral is enabled
  options_theta: number // Options summary theta
  login_enabled?: boolean // Whether account is loginable using email and password
  margin_model: string // Name of user's currently enabled margin model
  username?: string // Account name (given by user)
  interuser_transfers_enabled?: boolean // Whether inter-user transfers are enabled
  options_delta: number // Options summary delta
  options_pl: number // Options profit and Loss
  options_vega_map?: DeribitOptionsMap // Map of options' vegas per index
  balance: number // The account's balance
  total_equity_usd?: number // The account's total equity in USD
  additional_reserve: number // The account's balance reserved in other orders
  mmp_enabled?: boolean // Whether MMP is enabled
  projected_initial_margin: number // Projected initial margin
  email?: string // User email
  available_funds: number // The account's available funds
  spot_reserve: number // The account's balance reserved in active spot orders
  projected_delta_total: number // The sum of position deltas without positions that will expire during closest expiration
  portfolio_margining_enabled: boolean // Whether portfolio margining is enabled
  total_maintenance_margin_usd?: number // The account's total maintenance margin in USD
  total_margin_balance_usd?: number // The account's total margin balance in USD
  total_pl: number // Profit and loss
  margin_balance: number // The account's margin balance
  options_theta_map?: DeribitOptionsMap // Map of options' thetas per index
  total_delta_total_usd?: number // The account's total delta total in USD
  creation_timestamp?: number // Time at which the account was created
  available_withdrawal_funds: number // The account's available withdrawal funds
  equity: number // The account's current equity
  options_gamma: number // Options summary gamma
}

export type DeribitOrderResponse = {
  order: DeribitOrder
  trades: DeribitTrade[]
}

export type DeribitInstrumentsTimesTemp = {
  instrument_name: string
  last_trade_time: number
}

interface IDeribitLastTradesByInstrument {
  amount: number // Trade amount
  block_trade_id?: string // Block trade id (optional)
  block_trade_leg_count?: number // Block trade leg count (optional)
  contracts?: number // Trade size in contract units (optional)
  direction: 'buy' | 'sell' // Direction of the trade
  index_price: number // Index Price at the moment of trade
  instrument_name: string // Unique instrument identifier
  iv?: number // Option implied volatility for the price (Option only)
  liquidation?: 'M' | 'T' | 'MT' // Optional field (only for trades caused by liquidation)
  mark_price: number // Mark Price at the moment of trade
  price: number // Price in base currency
  tick_direction: 0 | 1 | 2 | 3 // Direction of the "tick"
  timestamp: number // The timestamp of the trade (milliseconds since the UNIX epoch)
  trade_id: string // Unique (per currency) trade identifier
  trade_seq: number // The sequence number of the trade within instrument
}

export type DeribitLastTradesByInstrument = {
  has_more: boolean // Indicates if there are more trades available
  trades: IDeribitLastTradesByInstrument[] // Array of trade objects
}

export type DeribitIndexResult = {
  estimated_delivery_price: number // Estimated delivery price for the market
  index_price: number // Value of requested index
}

type DeribitEnabledFeature = 'restricted_block_trades' | 'block_trade_approval'

export type DeribitAuthTokenResult = {
  access_token: string // Access token
  enabled_features: DeribitEnabledFeature[] // List of enabled advanced on-key features
  expires_in: number // Token lifetime in seconds
  refresh_token: string // Can be used to request a new token
  scope: string // Type of the access for assigned token
  sid?: string // Optional Session id
  state?: string // Copied from the input (if applicable)
  token_type: 'bearer' // Authorization type
}

export type DeribitCurrency = 'BTC' | 'ETH' | 'USDC' | 'USDT' | 'EURR' | 'any'

export type DeribitKind = 'future' | 'option' | 'spot' | 'future_combo' | 'option_combo'

export type DeribitDirection = 'buy' | 'sell' | 'zero'

export type DeribitDirectionTrade = 'buy' | 'sell'

export type DeribitOrderType =
  | 'limit'
  | 'stop_limit'
  | 'take_limit'
  | 'market'
  | 'stop_market'
  | 'take_market'
  | 'market_limit'
  | 'trailing_stop'
  | 'market'
  | 'stop_market'

export type DeribitTimeInForce = 'good_til_cancelled' | 'good_til_day' | 'immediate_or_cancel'

export type DeribitTriggerType = 'index_price' | 'mark_price' | 'last_price'

export type DeribitAdvancedOptionType = 'usd' | 'implv'

export type DeribitLinkedOrderType = 'one_triggers_other' | 'one_cancels_other' | 'one_triggers_one_cancels_other'

export type DeribitTriggerFillCondition = 'first_hit' | 'complete_fill' | 'incremental'

export type DeribitSortingOrder = 'asc' | 'desc' | 'default'

export type DeribitIndexName =
  | 'ada_usd'
  | 'algo_usd'
  | 'avax_usd'
  | 'bch_usd'
  | 'btc_usd'
  | 'doge_usd'
  | 'dot_usd'
  | 'eth_usd'
  | 'link_usd'
  | 'ltc_usd'
  | 'matic_usd'
  | 'near_usd'
  | 'shib_usd'
  | 'sol_usd'
  | 'trx_usd'
  | 'uni_usd'
  | 'usdc_usd'
  | 'xrp_usd'
  | 'ada_usdc'
  | 'bch_usdc'
  | 'algo_usdc'
  | 'avax_usdc'
  | 'btc_usdc'
  | 'doge_usdc'
  | 'dot_usdc'
  | 'eth_usdc'
  | 'link_usdc'
  | 'ltc_usdc'
  | 'matic_usdc'
  | 'near_usdc'
  | 'shib_usdc'
  | 'sol_usdc'
  | 'trx_usdc'
  | 'uni_usdc'
  | 'xrp_usdc'
  | 'ada_usdt'
  | 'algo_usdt'
  | 'avax_usdt'
  | 'bch_usdt'
  | 'bnb_usdt'
  | 'btc_usdt'
  | 'doge_usdt'
  | 'dot_usdt'
  | 'eth_usdt'
  | 'link_usdt'
  | 'ltc_usdt'
  | 'luna_usdt'
  | 'matic_usdt'
  | 'near_usdt'
  | 'shib_usdt'
  | 'sol_usdt'
  | 'trx_usdt'
  | 'uni_usdt'
  | 'xrp_usdt'
  | 'btcdvol_usdc'
  | 'ethdvol_usdc'

export type DeribitOrderStateResult = {
  time_in_force: DeribitTimeInForce // Order time in force
  reduce_only: boolean // 'true for reduce-only orders only'
  price: number | string // Price in base currency or "market_price" in case of open trigger market orders
  post_only: boolean // true for post-only orders only
  order_type: DeribitOrderType // Order type
  order_state: DeribitOrderState // Order state
  order_id: string // Unique order identifier
  max_show: number // Maximum amount within an order to be shown to other traders, 0 for invisible order.
  last_update_timestamp: number // The timestamp (milliseconds since the Unix epoch)
  label: string // User defined label (up to 64 characters)
  is_rebalance: boolean // Optional (only for spot). true if order was automatically created during cross-collateral balance restoration
  is_liquidation: boolean // true if order was automatically created during liquidation
  instrument_name: string // Unique instrument identifier
  filled_amount: number // Filled amount of the order
  direction: DeribitDirection // Direction: buy, or sell
  creation_timestamp: number // The timestamp (milliseconds since the Unix epoch)
  average_price: number // Average fill price of the order
  api: boolean // true if created with API
  amount: number // It represents the requested order size
  reject_post_only?: boolean // true if order has reject_post_only flag (field is present only when post_only is true)
  quote_id?: string // The same QuoteID as supplied in the private/mass_quote request.
  is_secondary_oto?: boolean // true if the order is an order that can be triggered by another order, otherwise not present.
  usd?: number // Option price in USD (Only if advanced="usd")
  implv?: number // Implied volatility in percent. (Only if advanced="implv")
  trigger_reference_price?: number // The price of the given trigger at the time when the order was placed (Only for trailing trigger orders)
  original_order_type?: string // Original order type. Optional field
  oco_ref?: string // Unique reference that identifies a one_cancels_others (OCO) pair.
  block_trade?: boolean // true if order made from block_trade trade, added only in that case.
  trigger_price?: number // Trigger price (Only for future trigger orders)
  mmp: boolean // true if the order is a MMP order, otherwise false.
  oto_order_ids?: string[] // The Ids of the orders that will be triggered if the order is filled
  trigger_order_id?: string // Id of the trigger order that created the order (Only for orders that were created by triggered orders).
  cancel_reason?:
  | 'user_request'
  | 'autoliquidation'
  | 'cancel_on_disconnect'
  | 'risk_mitigation'
  | 'pme_risk_reduction'
  | 'pme_account_locked'
  | 'position_locked'
  | 'mmp_trigger'
  | 'mmp_config_curtailment'
  | 'edit_post_only_reject'
  | 'oco_other_closed'
  | 'oto_primary_closed'
  | 'settlement' // Enumerated reason behind cancel
  primary_order_id?: string // Unique order identifier
  quote?: boolean // If order is a quote. Present only if true.
  risk_reducing: boolean // true if the order is marked by the platform as a risk reducing order (can apply only to orders placed by PM users), otherwise false.
  app_name?: string // The name of the application that placed the order on behalf of the user (optional).
  mmp_cancelled?: boolean // true if order was cancelled by mmp trigger (optional)
  trigger_offset?: number // The maximum deviation from the price peak beyond which the order will be triggered (Only for trailing trigger orders)
  mmp_group?: string // Name of the MMP group supplied in the private/mass_quote request.
  is_primary_otoco?: boolean // true if the order is an order that can trigger an OCO pair, otherwise not present.
  mobile?: boolean // optional field with value true added only when created with Mobile Application
  trigger_fill_condition?: DeribitTriggerFillCondition // The fill condition of the linked order (Only for linked order types)
  triggered?: boolean // Whether the trigger order has been triggered
  replaced: boolean // true if the order was edited (by user or - in case of advanced options orders - by pricing engine), otherwise false.
  auto_replaced?: boolean // Options, advanced orders only - true if last modification of the order was performed by the pricing engine, otherwise false.
  quote_set_id?: string // Identifier of the QuoteSet supplied in the private/mass_quote request.
  contracts?: number // It represents the order size in contract units. (Optional, may be absent in historical data).
  trigger?: DeribitTriggerType // Trigger type (only for trigger orders)
  web?: boolean // true if created via Deribit frontend (optional)
}

export type DeribitInstrumentSummary = {
  volume_usd: number
  volume: number
  quote_currency: string
  price_change: number
  open_interest: number
  mid_price: number | null
  mark_price: number
  mark_iv: number
  low: number | null
  last: number | null
  instrument_name: string
  high: number | null
  estimated_delivery_price: number
  creation_timestamp: number
  bid_price: number | null
  base_currency: string
  ask_price: number | null
  funding_8h?: number
  current_funding?: number
}

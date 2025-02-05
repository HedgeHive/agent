import axios, { AxiosError, AxiosInstance } from 'axios'

import {
  DeribitCurrency,
  DeribitCombo,
  DeribitInstrument,
  DeribitOrderbook,
  DeribitPosition,
  DeribitDirectionTrade,
  DeribitKind,
  DeribitOrderParameters,
  DeribitTrades,
  DeribitOrderResponse,
  DeribitAccountSummary,
  DeribitSortingOrder,
  DeribitLastTradesByInstrument,
  DeribitIndexName,
  DeribitIndexResult,
  DeribitAuthTokenResult,
  DeribitAuthCredentials,
  DeribitAuthData,
  DeribitOrderStateResult,
  DeribitTrade,
  DeribitInstrumentSummary,
} from './types'

function addParamsToQuery(optionalParams: Record<string, any>): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(optionalParams)) {
    if (value !== undefined) {
      params.append(key, value.toString())
    }
  }

  return params.toString()
}

export class DeribitApiService {
  private readonly _credentials: DeribitAuthCredentials
  private readonly _client: AxiosInstance

  private _authData: DeribitAuthData | null = null

  public constructor(testMode = false, credentials: DeribitAuthCredentials | null = null) {
    if(credentials) {
      this._credentials = credentials
    } else {
      this._credentials = {client_id: '', client_secret: ''}
    }

    const baseURL = testMode ? 'https://test.deribit.com/api/v2/' : 'https://www.deribit.com/api/v2/'

    this._client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /** Internals */
  private _handleApiError = (error: unknown) => {
    const axiosError = error as AxiosError
    if (axiosError.response) {
      return new Error(
        `DeribitConnector Error | Status: ${axiosError.response.status} | Data: ${JSON.stringify(
          axiosError.response.data
        )}`
      )
    } else if (axiosError.request) {
      return new Error(`DeribitConnector Error | No response received: ${axiosError.request}`)
    } else {
      return new Error(`DeribitConnector Error: ${(error as Error).message}`)
    }
  }

  private async _refreshAccessToken(): Promise<DeribitAuthTokenResult> {
    if (this._authData === null) {
      throw new Error('Unauthorized')
    }

    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this._credentials.client_id,
        client_secret: this._credentials.client_secret,
        refresh_token: this._authData.refresh_token,
      })

      const response = await this._client.get(`/public/auth?${params}`)

      return response.data.result
    } catch (e) {
      console.error(e, 'Failed to refresh access token')
      throw this._handleApiError(e)
    }
  }

  private async _getAuth(): Promise<DeribitAuthTokenResult> {
    try {
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this._credentials.client_id,
        client_secret: this._credentials.client_secret,
      })

      const response = await this._client.get(`/public/auth?${params}`)

      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  private async _getAccessToken(): Promise<string> {
    if (this._authData === null) {
      throw new Error('Unauthorized')
    }

    const now = ~~(Date.now() / 1000)
    const expiresAt = this._authData.issued_at + this._authData.expires_in

    if (now >= expiresAt) {
      try {
        const auth = await this._refreshAccessToken()
        this._authData = {
          access_token: auth.access_token,
          expires_in: auth.expires_in,
          refresh_token: auth.refresh_token,
          issued_at: now,
        }
      } catch (error) {
        console.error('Error while refreshing access token, re-authenticating')
        await this.authenticate(true)
      }
    }

    return this._authData.access_token
  }

  /** Public Endpoints */
  public async getInstruments(
    currency: DeribitCurrency,
    kind?: DeribitKind,
    expired?: boolean
  ): Promise<Array<DeribitInstrument>> {
    try {
      const params = addParamsToQuery({ currency, kind, expired })

      const response = await this._client.get(`/public/get_instruments?${params}`)

      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getInstrument(instrument_name: string): Promise<DeribitInstrument> {
    try {
      const params = addParamsToQuery({ instrument_name })

      const response = await this._client.get(`/public/get_instrument?${params}`)

      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getOrderbook(instrument_name: string, depth?: number): Promise<DeribitOrderbook> {
    try {
      const params = addParamsToQuery({ instrument_name, depth })

      const response = await this._client.get(`/public/get_order_book?${params}`)

      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getBookSummaryByCurrency(
    currency: DeribitCurrency,
    kind?: DeribitKind
  ): Promise<DeribitInstrumentSummary[]> {
    try {
      const params = addParamsToQuery({ currency, kind })
      const response = await this._client.get(`/public/get_book_summary_by_currency?${params}`)
      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getBookSummaryByInstrument(
    instrument_name: string
  ): Promise<DeribitInstrumentSummary> {
    try {
      const params = addParamsToQuery({ instrument_name })
      const response = await this._client.get(`/public/get_book_summary_by_instrument?${params}`)
      return response.data.result[0]
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getLastTradesByInstrument(
    instrument_name: string,
    start_seq?: number,
    end_seq?: number,
    start_timestamp?: number,
    end_timestamp?: number,
    count?: number,
    sorting?: DeribitSortingOrder
  ): Promise<DeribitLastTradesByInstrument> {
    try {
      const params = addParamsToQuery({
        instrument_name,
        start_seq,
        end_seq,
        start_timestamp,
        end_timestamp,
        count,
        sorting,
      })

      const response = await this._client.get(`/public/get_last_trades_by_instrument?${params}`)

      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getIndexPrice(indexName: DeribitIndexName): Promise<DeribitIndexResult> {
    try {
      const response = await this._client.get(`/public/get_index_price?index_name=${indexName}`)
      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  /** Private Endpoints */
  public async getPositions(
    currency?: DeribitCurrency,
    kind?: DeribitKind,
    subaccount_id?: boolean
  ): Promise<Array<DeribitPosition>> {
    try {
      const accessToken = await this._getAccessToken()

      const params = addParamsToQuery({ currency, kind, subaccount_id })

      const response = await this._client.get(`/private/get_positions?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async createCombo(trades: Array<DeribitTrades>): Promise<DeribitCombo> {
    try {
      const accessToken = await this._getAccessToken()

      const response = await this._client.post(
        '',
        {
          id: 1,
          jsonrpc: '2.0',
          method: 'private/create_combo',
          params: {
            trades,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async placeOrder(
    action: DeribitDirectionTrade,
    params: DeribitOrderParameters
  ): Promise<DeribitOrderResponse> {
    try {
      const accessToken = await this._getAccessToken()

      const response = await this._client.post(
        '',
        {
          id: 1,
          jsonrpc: '2.0',
          method: `private/${action}`,
          params: {
            ...params,
            type: params.type ? params.type : 'limit',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async cancelOrder(order_id: string): Promise<DeribitOrderStateResult> {
    try {
      const accessToken = await this._getAccessToken()

      const response = await this._client.post(
        '',
        {
          id: 1,
          jsonrpc: '2.0',
          method: 'private/cancel',
          params: {
            order_id,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getAccountSummary(
    currency: DeribitCurrency,
    subaccount_id?: number,
    extended?: boolean
  ): Promise<DeribitAccountSummary> {
    try {
      const accessToken = await this._getAccessToken()

      const params = addParamsToQuery({ currency, extended, subaccount_id })

      const response = await this._client.get(`/private/get_account_summary?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getOrderHistoryByCurrency(
    currency: DeribitCurrency,
    kind?: DeribitKind,
    count?: number,
    offset?: number,
    include_old?: boolean,
    include_unfilled?: boolean
  ) {
    try {
      const accessToken = await this._getAccessToken()

      const params = addParamsToQuery({ currency, kind, count, offset, include_old, include_unfilled })

      const response = await this._client.get(`/private/get_order_history_by_currency?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getOrderState(order_id: string): Promise<DeribitOrderStateResult> {
    try {
      const accessToken = await this._getAccessToken()

      const params = addParamsToQuery({ order_id })

      const response = await this._client.get(`/private/get_order_state?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  public async getUserTradesByOrder(order_id: string): Promise<Array<DeribitTrade>> {
    try {
      const accessToken = await this._getAccessToken()

      const params = addParamsToQuery({ order_id })

      const response = await this._client.get(`/private/get_user_trades_by_order?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      return response.data.result
    } catch (e) {
      throw this._handleApiError(e)
    }
  }

  /** Logic */
  public async authenticate(reset?: boolean): Promise<void> {
    if (this._authData && !reset) {
      return
    }

    // Authenticate client
    const auth = await this._getAuth()
    this._authData = {
      access_token: auth.access_token,
      expires_in: auth.expires_in,
      refresh_token: auth.refresh_token,
      issued_at: ~~(Date.now() / 1000),
    }
  }
}

let readOnlyDeribitClient: DeribitApiService | null = null
export const getDeribitSingleton = (): DeribitApiService => {
  if (!readOnlyDeribitClient) {
    readOnlyDeribitClient = new DeribitApiService()
  }

  return readOnlyDeribitClient
}

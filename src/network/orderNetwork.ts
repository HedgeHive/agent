export type Order = Record<string, any>
export type OrderListener = (order: Order) => Promise<void>

export interface OrderNetwork {
    push(order: Order): Promise<void>
    subscribe(callback: OrderListener): void
}

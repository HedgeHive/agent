import { createLibp2p, Libp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { Identify, identify, IdentifyPush, identifyPush } from '@libp2p/identify'
import { kadDHT, KadDHT } from '@libp2p/kad-dht'
import { bootstrap } from '@libp2p/bootstrap';
import { ping, PingService } from '@libp2p/ping';
import { gossipsub, GossipsubEvents } from '@chainsafe/libp2p-gossipsub';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { PubSub } from '@libp2p/interface'

import type { Order, OrderListener, OrderNetwork } from './orderNetwork';

class KaDDHTNetwork implements OrderNetwork {
    discoveryNodes = ['/ip4/78.47.53.19/tcp/8000/p2p/12D3KooWSEPQQnyrmaz5dimWkBbzBcpqDU2ESHNBUMAHub7xjnKy']
    topic = 'orderbook'
    node: Libp2p<{
        dht: KadDHT,
        pubsub: PubSub<GossipsubEvents>,
        identify: Identify,
        identifyPush: IdentifyPush,
        ping: PingService,
    }>
    orderListeners: OrderListener[] = []

    constructor() {}

    async start() {
        this.node = await createLibp2p({
            addresses: {
              listen: ['/ip4/0.0.0.0/tcp/0']
            },
            transports: [tcp()],
            streamMuxers: [yamux()],
            connectionEncrypters: [noise()],
            services: {
              dht: kadDHT({
                protocol: '/ipfs/kad/1.0.0',
                clientMode: true,
              }),
              pubsub: gossipsub(),
              identify: identify(),
              identifyPush: identifyPush(),
              ping: ping(),
            },
            peerDiscovery: [
              bootstrap({ list: this.discoveryNodes })
            ],
        })

        console.log(`Default node started at ${this.node.getMultiaddrs().toString()} xyn`);

        this.node.addEventListener('peer:discovery', (evt) => {
            console.log('Discovered %s', evt.detail.id.toString()) // Log discovered peer
        })

        this.node.addEventListener('peer:connect', (evt) => {
            console.log('Connected to %s', evt.detail.toString()) // Log connected peer
        })

        await this.node.start()

        await this.node.services.pubsub.subscribe(this.topic)
        this.node.services.pubsub.addEventListener("message", (evt) => {
            const order = JSON.parse(
                uint8ArrayToString(evt.detail.data),
                (name, value) => {
                    if (typeof value === 'string' && /^\d+n?$/.test(value) && (name.includes('margin'))) {
                        return BigInt(value)
                    }
                    if (typeof value === 'object' && Array.isArray(value) && name.includes('params')) {
                        return value.map(v => BigInt(v))
                    }
                    return value
                }
            )
            console.log('Order received', this.topic, order)
            this.orderListeners.forEach(c => c(order).catch(error => console.error(error)))
        })
    }

    async push(order: Order) {
        try {
            console.log('Pushing order', order)

            await this.node.services.pubsub.publish(this.topic, uint8ArrayFromString(JSON.stringify(
                order,
                (_, value) => typeof value === 'bigint' ? value.toString() : value
            )))
        } catch (error) {
            if (error.message === 'PublishError.NoPeersSubscribedToTopic') {
                console.warn('No subscribed nodes found')
                return
            }
            throw error
        }
    }

    subscribe(callback: OrderListener) {
        this.orderListeners.push(callback)
        console.log('Order listener added')
    }
}

export const createKaDDHTNetwork = async (): Promise<OrderNetwork> => {
    const n = new KaDDHTNetwork()
    await n.start()

    return n
}

import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identify, identifyPush } from '@libp2p/identify'
import { kadDHT } from '@libp2p/kad-dht'
import { ping } from '@libp2p/ping'
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";


const topic = 'orderbook'
const node = await createLibp2p({
    addresses: {
        listen: ['/ip4/0.0.0.0/tcp/8000']
    },
    transports: [tcp()],
    streamMuxers: [yamux()],
    connectionEncrypters: [noise()],
    services: {
        dht: kadDHT({
            protocol: '/ipfs/kad/1.0.0',
            clientMode: false
        }),
        identify: identify(),
        identifyPush: identifyPush(),
        ping: ping(),
        pubsub: gossipsub(),
    }
})

await node.start();
console.log(`Bootstrap node started at ${node.getMultiaddrs().toString()} xyn`);

node.services.pubsub.addEventListener("message", (evt) => {
    console.log(`boot received: ${uint8ArrayToString(evt.detail.data)} on topic ${evt.detail.topic}`)
})

node.addEventListener('peer:discovery', (evt) => {
    console.log('Discovered %s', evt.detail.id.toString()) // Log discovered peer
})

node.addEventListener('peer:connect', (evt) => {
    console.log('Connected to %s', evt.detail.toString()) // Log connected peer
})

await node.services.pubsub.subscribe(topic)

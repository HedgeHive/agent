import assert from 'assert';
import { createKaDDHTNetwork } from './kadDhtNetwork'

const main = async () => {
  const delay = async (ms: number) => { console.log(`Waiting: ${ms}ms`); await new Promise(r => setTimeout(r, ms)) }
  const n1 = await createKaDDHTNetwork()
  const n2 = await createKaDDHTNetwork()

  n1.subscribe(async (o) => { console.log('Received a message'); assert(o.id === 2 && o.name === '1', 'Received wrong order')})
  n2.subscribe(async (o) => { console.log('Received a message'); assert(o.id === 1 && o.name === '1', 'Received wrong order')})

  await delay(5e3)

  await n1.push({ id: 1, name: '1' })
  await n2.push({ id: 2, name: '1' })
}

main()
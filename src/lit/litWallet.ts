import {
  createLitNodeClient,
  createEthersWallet,
  createLitContractsClient,
  mintCapacityCredit,
  mintPKP,
  getPKPSessionSigs,
  generateWrappedKey,
  getWrappedKeyMetadata,
} from "@goat-sdk/wallet-lit";
import { createEVMWallet } from "./evm";
import { createWalletClient, http } from "viem";
import { LIT_NETWORK } from "@lit-protocol/constants";
import chains, { arbitrum } from "viem/chains";
import { WalletClientBase } from "@goat-sdk/core";
import { Delegatee } from "@lit-protocol/aw-signer"

export const getLitWallet = async (): Promise<WalletClientBase> => {
  // Initialize Lit components
  const litNodeClient = await createLitNodeClient(LIT_NETWORK.DatilTest);
  const ethersWallet = createEthersWallet(process.env.WALLET_PRIVATE_KEY);
  const litContractsClient = await createLitContractsClient(ethersWallet, LIT_NETWORK.DatilTest);

  // Mint capacity credit and PKP
  const capacityCredit = await mintCapacityCredit(
    litContractsClient,
    10, // requests per second
    30 // days until expiration
  );

  const delegatee = await Delegatee.create(
    process.env.WALLET_PRIVATE_KEY,
    {
      litNetwork: LIT_NETWORK.DatilTest
    }
  );

  const pkps = await delegatee.getDelegatedPkps();
  let pkp;
  if (pkps.length === 0) {
    console.log("No PKP delegated. Minting PKP");
    pkp = await mintPKP(litContractsClient);
    await delegatee.setCredentials({
      pkp
    });
  } else {
    pkp = pkps[0];
  }

  console.log("PKP: ", pkp);

  // Get session signatures
  const pkpSessionSigs = await getPKPSessionSigs(
    litNodeClient,
    pkp.publicKey,
    pkp.ethAddress,
    ethersWallet,
    capacityCredit.capacityTokenId
  );
  console.log("PKP session signatures: ", pkpSessionSigs);

  // Generate wrapped key and get metadata
  const wrappedKey = await generateWrappedKey(litNodeClient, pkpSessionSigs, "evm");
  console.log("Wrapped key generated: ", wrappedKey);
  const wrappedKeyMetadata = await getWrappedKeyMetadata(litNodeClient, pkpSessionSigs, wrappedKey.id);
  console.log("Wrapped key metadata: ", wrappedKeyMetadata);
  // Create viem wallet client
  const viemWalletClient = createWalletClient({
    transport: http(process.env.RPC_URL),
    chain: arbitrum,
  });

  // Initialize Lit wallet client
  return createEVMWallet({
    litNodeClient,
    pkpSessionSigs,
    wrappedKeyMetadata,
    network: "evm",
    chainId: arbitrum.id,
    litEVMChainIdentifier: 'arbitrum',
    viemWalletClient,
  })
}
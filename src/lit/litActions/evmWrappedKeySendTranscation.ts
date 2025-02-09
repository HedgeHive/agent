export const sendTransactionLitActionCode = `
const LIT_PREFIX = "lit_";

async function getDecryptedKeyToSingleNode({
  accessControlConditions,
  ciphertext,
  dataToEncryptHash,
}) {
  try {
    return await Lit.Actions.decryptToSingleNode({
      accessControlConditions,
      ciphertext,
      dataToEncryptHash,
      chain: "ethereum",
      authSig: null,
    });
  } catch (err) {
    throw new Error(\`Error decrypting key: \${err.message}\`);
  }
}

function removeSaltFromDecryptedKey(decryptedPrivateKey) {
  if (!decryptedPrivateKey.startsWith(LIT_PREFIX)) {
    throw new Error(
      \`Private Key was not encrypted with salt; must be prefixed with '\${LIT_PREFIX}'\`
    );
  }
  return decryptedPrivateKey.slice(LIT_PREFIX.length);
}

async function sendEthereumTransaction({ privateKey, txData }) {
  const wallet = new ethers.Wallet(privateKey);
  const provider = new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc"); 
  const walletConnected = wallet.connect(provider);

  const tx = JSON.parse(txData);
  const txResponse = await walletConnected.sendTransaction(tx);
  await txResponse.wait();

  return txResponse.hash;
}

async function sendContractTransaction({ privateKey, contractAddress, abi, functionName, args, value }) {
  const wallet = new ethers.Wallet(privateKey);
  const provider = new ethers.providers.JsonRpcProvider("https://arb1.arbitrum.io/rpc"); 
  const walletConnected = wallet.connect(provider);

  // Load the contract
  const contract = new ethers.Contract(contractAddress, JSON.parse(abi), walletConnected);

  // Call the contract method with args
  const txResponse = await contract[functionName](...JSON.parse(args), {
    value: ethers.utils.parseUnits(value || "0", "ether"),
  });

  await txResponse.wait();

  return txResponse.hash;
}

(async () => {
  try {
    const decryptedPrivateKey = await getDecryptedKeyToSingleNode({
      accessControlConditions,
      ciphertext,
      dataToEncryptHash,
    });

    if (!decryptedPrivateKey) {
      return;
    }

    const privateKey = removeSaltFromDecryptedKey(decryptedPrivateKey);

    let txHash;
    if (contractAddress) {
      txHash = await sendContractTransaction({
        privateKey,
        contractAddress,
        abi,
        functionName,
        args,
        value,
      });
    } else {
      txHash = await sendEthereumTransaction({
        privateKey,
        txData,
      });
    }

    Lit.Actions.setResponse({ response: txHash });
  } catch (err) {
    Lit.Actions.setResponse({ response: \`Error: \${err.message}\` });
  }
})();
`;



export const connectKeplr = async (chainId = 'cosmos') => {
  if (window.getOfflineSigner && window.getOfflineSigner(chainId)) {
    const signer = window.getOfflineSigner(chainId);
    await signer.connect();
    const accounts = await signer.getAccounts();
    return accounts[0].address;
  } else {
    throw new Error('Keplr wallet not installed or supported.');
  }
};

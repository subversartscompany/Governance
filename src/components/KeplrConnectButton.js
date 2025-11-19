
import React, { useState } from 'react';

export const KeplrConnectButton = ({ onAddressUpdate }) => {
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    if (window.getOfflineSigner && window.getOfflineSigner('cosmos')) {
      const signer = window.getOfflineSigner('cosmos');
      await signer.connect();
      const account = await signer.getAccounts();
      const address = account[0].address;
      onAddressUpdate(address);
      setConnected(true);
    } else {
      alert('Veuillez installer Keplr!');
    }
  };

  return (
    <button
      onClick={handleConnect}
      className="px-6 py-2 bg-blue-500 rounded-full text-white"
    >
      {connected ? 'Connecté' : 'Connectez-vous avec Keplr'}
    </button>
  );
};


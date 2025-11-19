
// /src/app.js
import React, { useState } from 'react';
import { KeplrConnectButton } from './components/KeplrConnectButton';
import UserNFTs from './components/UserNFTs';

function App() {
  const [userAddress, setUserAddress] = useState(null);

  const handleAddressUpdate = (address) => {
    setUserAddress(address);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Bienvenue sur la plateforme de gouvernance</h1>
        <p className="text-lg mb-8">Connectez-vous via Keplr pour accéder à vos privilèges exclusifs</p>
        {userAddress ? (
          <UserNFTs userAddress={userAddress} />
        ) : (
          <KeplrConnectButton onAddressUpdate={handleAddressUpdate} />
        )}
      </header>
    </div>
  );
}

export default App;

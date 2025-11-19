
import React, { useState, useEffect } from 'react';

const UserNFTs = ({ userAddress }) => {
  const [nfts, setNfts] = useState([]);
  const [privileges, setPrivileges] = useState([]);

  useEffect(() => {
    // Récupérer les NFTs et privilèges depuis l'API ou la blockchain
    const fetchNFTs = async () => {
      const response = await fetch(`/api/nfts?address=${userAddress}`);
      const data = await response.json();
      setNfts(data.nfts);

      // Déterminer les privilèges en fonction des NFTs
      const userPrivileges = determinePrivileges(data.nfts);
      setPrivileges(userPrivileges);
    };

    if (userAddress) {
      fetchNFTs();
    }
  }, [userAddress]);

  const determinePrivileges = (nfts) => {
    // Logique pour déterminer les privilèges en fonction des NFTs
    return nfts.map((nft) => {
      if (nft.type === 'VIP') return 'Accès aux fonctionnalités premium';
      if (nft.type === 'BASIC') return 'Accès aux fonctionnalités standard';
      return 'Accès limité';
    });
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold">Vos NFTs</h2>
      <ul className="list-disc pl-8">
        {nfts.map((nft) => (
          <li key={nft.id} className="text-lg">{nft.name}</li>
        ))}
      </ul>

      <h3 className="text-xl font-bold mt-4">Privilèges associés :</h3>
      <ul className="list-disc pl-8">
        {privileges.map((priv, index) => (
          <li key={index} className="text-lg">{priv}</li>
        ))}
      </ul>
    </div>
  );
};

export default UserNFTs;


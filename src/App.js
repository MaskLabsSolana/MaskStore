import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ConnectWallet from "./components/ConnectWallet";
import VaultDashboard from "./components/VaultDashboard";
import MyVault from "./components/MyVault"; // Make sure this file exists

function App() {
  const [walletAddress, setWalletAddress] = useState("");

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !walletAddress ? (
              <ConnectWallet setWalletAddress={setWalletAddress} />
            ) : (
              <VaultDashboard
                walletAddress={walletAddress}
                setWalletAddress={setWalletAddress}
              />
            )
          }
        />
        <Route path="/myvault" element={<MyVault />} />
      </Routes>
    </Router>
  );
}

export default App;

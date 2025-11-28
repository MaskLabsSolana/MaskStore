import React, { useMemo, useState } from "react";
import Web3Modal from "web3modal";
import WalletConnectProvider from "@walletconnect/web3-provider";
import { BrowserProvider } from "ethers";
import "../styles/ConnectWallet.css";

const ConnectWallet = ({ setWalletAddress }) => {
  const [status, setStatus] = useState("IDLE");
  const [terminalLines, setTerminalLines] = useState([
    "[BOOT] Mask Store shell online.",
    "[SIG] Silent tunnel calibrated.",
    "[OK] Awaiting Phantom signal.",
  ]);

  const pushTerminal = (line) => {
    setTerminalLines((prev) => {
      const updated = [...prev, line];
      return updated.slice(-7);
    });
  };

  const rpcUrl = process.env.REACT_APP_WALLETCONNECT_RPC || "https://rpc.ankr.com/eth";
  const walletConnectChainId = Number(process.env.REACT_APP_WALLETCONNECT_CHAIN_ID || 1);

  const providerOptions = useMemo(
    () => ({
      walletconnect: {
        package: WalletConnectProvider,
        options: {
          rpc: {
            [walletConnectChainId]: rpcUrl,
          },
          chainId: walletConnectChainId,
          qrcodeModalOptions: {
            mobileLinks: ["rainbow", "metamask", "zerion", "trust", "okxwallet"],
          },
        },
      },
    }),
    [rpcUrl, walletConnectChainId]
  );

  const isMobileBrowser = /Mobi|Android|iPhone|iPad/i.test(
    typeof window !== "undefined" ? window.navigator.userAgent : ""
  );

  const connectWallet = async () => {
    setStatus("CONNECTING");
    pushTerminal("> Scanning for Phantom endpoint...");
    try {
      const phantom = window?.solana;
      if (phantom && phantom.isPhantom) {
        pushTerminal("> Phantom detected. Establishing masked session...");
        const response = await phantom.connect();
        const address = response.publicKey.toString();
        setWalletAddress(address);
        pushTerminal(`[LINK] Sol channel masked: ${address.substring(0, 4)}...${address.slice(-4)}`);
        setStatus("CONNECTED");
        return;
      }

      pushTerminal("> Phantom not found. Trying RainbowKit/Web3 fallback...");
      if (!window.ethereum && isMobileBrowser) {
        pushTerminal("> Mobile Chrome detected. Opening WalletConnect tunnel...");
      }

      const web3Modal = new Web3Modal({
        cacheProvider: false,
        providerOptions,
        theme: "dark",
      });
      const connection =
        !window.ethereum && isMobileBrowser
          ? await web3Modal.connectTo("walletconnect")
          : await web3Modal.connect();
      const provider = new BrowserProvider(connection);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      pushTerminal(`[LINK] EVM relay masked: ${address.substring(0, 6)}...${address.slice(-4)}`);
      setStatus("CONNECTED");
    } catch (err) {
      pushTerminal("[ERR] Wallet connection failed.");
      pushTerminal(
        "[WARN] If you're on Chrome mobile, approve the WalletConnect request inside your wallet app."
      );
      setStatus("UNAVAILABLE");
      console.error("Wallet connection failed:", err);
    }
  };

  const statusClass = status.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="mask-shell">
      <div className="mask-noise" />
      <div className="mask-grid">
        <div className="mask-card">
          <p className="mask-tag">MASK STORE // ACCESS NODE</p>
          <h1 className="mask-title">
            Mask <span>Store</span> 
          </h1>
          <p className="mask-copy">
            Mask Store is a silent, private chamber for your online life. Files, notes, identities and keys enter already encrypted and stay sealed until you unlock them.
          </p>

          <div className="mask-status">
            <span className={`status-dot ${statusClass}`} />
            <span className="status-label">{status}</span>
          </div>

          <div className="mask-actions">
            <button className="primary-btn" onClick={connectWallet}>
              {status === "CONNECTED" ? "Re-enter Mask Store" : "Link Wallet"}
            </button>
            <div className="secondary-info">
              <p>Phantom is preferred. Fallback supports RainbowKit/Web3 wallets. Mobile? Use Phantom app browser.</p>
            </div>
          </div>

          <div className="mask-meta">
            <div>
              <p className="meta-label">CHAMBER</p>
              <p className="meta-value">Mask-grade privacy</p>
            </div>
            <div>
              <p className="meta-label">ROUTING</p>
              <p className="meta-value">Silent mesh</p>
            </div>
            <div>
              <p className="meta-label">STATUS</p>
              <p className="meta-value">
                {status === "CONNECTED" ? "Mask channel ready" : "Awaiting handshake"}
              </p>
            </div>
          </div>
        </div>

        <div className="mask-terminal">
          <div className="terminal-header">
            <span>SESSION LOG</span>
            <span>v3.7</span>
          </div>
          <div className="terminal-body">
            {terminalLines.map((line, idx) => (
              <p key={`${line}-${idx}`}>{line}</p>
            ))}
          </div>
          <div className="terminal-footer">
            <span>Access Level: Hidden</span>
            <span className="pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectWallet;

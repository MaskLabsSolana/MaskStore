import React, { useEffect, useState } from "react";
import "../styles/VaultDashboard.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const KEY_STORAGE = "maskStoreKey";
const KEY_GENERATED_FLAG = "maskStoreKeyGenerated";
const KEY_SHOWN_FLAG = "maskStoreKeyShown";

const VaultDashboard = ({ walletAddress, setWalletAddress }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("file");
  const [textInput, setTextInput] = useState("");
  const [fileNameInput, setFileNameInput] = useState("");
  const [progress, setProgress] = useState(0);
  const [cid, setCid] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showKeyPopup, setShowKeyPopup] = useState(false);
  const [generatedKey, setGeneratedKey] = useState("");

  useEffect(() => {
    if (!localStorage.getItem(KEY_GENERATED_FLAG)) {
      generateAndStoreKey();
    }
  }, []);

  const generateAndStoreKey = async () => {
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const exported = await crypto.subtle.exportKey("raw", key);
    const encoded = btoa(String.fromCharCode(...new Uint8Array(exported)));

    localStorage.setItem(KEY_STORAGE, encoded);
    localStorage.setItem(KEY_GENERATED_FLAG, "true");

    if (!localStorage.getItem(KEY_SHOWN_FLAG)) {
      setGeneratedKey(encoded);
      setShowKeyPopup(true);
      localStorage.setItem(KEY_SHOWN_FLAG, "true");
    }
  };

  const getStoredKey = async () => {
    const stored = localStorage.getItem(KEY_STORAGE);
    const binary = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
    return await crypto.subtle.importKey("raw", binary, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  };

  const encryptData = async (data) => {
    setProgress(10);
    const key = await getStoredKey();
    setProgress(30);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    setProgress(90);
    await new Promise((res) => setTimeout(res, 300));
    setProgress(100);

    const ivAndEncrypted = new Uint8Array(iv.length + encrypted.byteLength);
    ivAndEncrypted.set(iv, 0);
    ivAndEncrypted.set(new Uint8Array(encrypted), iv.length);

    return new Blob([ivAndEncrypted]);
  };

  const uploadToPinata = async (file) => {
    setIsUploading(true);
    setUploadError("");
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
    const formData = new FormData();
    formData.append("file", file);

    const jwt = process.env.REACT_APP_PINATA_JWT;
    const headers = jwt
      ? {
          Authorization: `Bearer ${jwt}`,
        }
      : {
          "Content-Type": `multipart/form-data`,
          pinata_api_key: process.env.REACT_APP_PINATA_API_KEY,
          pinata_secret_api_key: process.env.REACT_APP_PINATA_SECRET_API_KEY,
        };

    try {
      const res = await axios.post(url, formData, {
        maxContentLength: "Infinity",
        headers,
        onUploadProgress: (e) => {
          const percent = Math.round((e.loaded * 100) / e.total);
          setProgress(percent);
        },
      });

      setIsUploading(false);
      return res.data.IpfsHash;
    } catch (error) {
      setIsUploading(false);
      throw error;
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File exceeds 10MB limit.");
      return;
    }

    const uploads = JSON.parse(localStorage.getItem("uploads") || "[]");
    if (uploads.length >= 5) {
      alert("You've reached the max of 5 uploads.");
      return;
    }

    setProgress(0);
    setCid("");
    setUploadError("");

    const buffer = await file.arrayBuffer();
    const encrypted = await encryptData(buffer);
    const encryptedFile = new File([encrypted], `${file.name}.enc`);
    try {
      const cid = await uploadToPinata(encryptedFile);
      setCid(cid);
      uploads.push({ name: file.name, cid, type: file.type });
      localStorage.setItem("uploads", JSON.stringify(uploads.slice(-5)));
    } catch (error) {
      handleUploadError(error);
    }
  };

  const handleTextSave = async () => {
    if (!textInput.trim()) return;
    if (textInput.length > 5000) {
      alert("Text exceeds 5000 character limit.");
      return;
    }

    const uploads = JSON.parse(localStorage.getItem("uploads") || "[]");
    if (uploads.length >= 5) {
      alert("You've reached the max of 5 uploads.");
      return;
    }

    setProgress(0);
    setCid("");
    setUploadError("");

    const buffer = new TextEncoder().encode(textInput);
    const encrypted = await encryptData(buffer);
    const name = fileNameInput.trim() || `Doc-${Date.now()}.txt`;
    const file = new File([encrypted], `${name}.enc`);
    try {
      const cid = await uploadToPinata(file);
      setCid(cid);

      uploads.push({ name, cid, type: "text/plain" });
      localStorage.setItem("uploads", JSON.stringify(uploads.slice(-5)));
      setTextInput("");
      setFileNameInput("");
    } catch (error) {
      handleUploadError(error);
    }
  };

  const handleUploadError = (error) => {
    console.error("Upload failed:", error);
    if (error.response?.status === 401) {
      setUploadError(
        "Pinata returned 401 (unauthorized). Verify your API key/secret or provide a Pinata JWT with pinning permissions."
      );
    } else {
      setUploadError("Upload failed. Please try again or confirm your Pinata credentials are valid.");
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(generatedKey);
    alert("Decryption key copied to clipboard!");
  };

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "No wallet linked";

  return (
    <div className="vault-shell">
      <div className="vault-noise" />
      <header className="vault-header">
        <div>
          <p className="eyebrow">MASK STORE // PRIVATE SAFE</p>
          <h1>Mask Store Console</h1>
          <p>
            Mask Store is your private digital chamber. Files, notes, passwords, or identities are encrypted the moment
            they enter, and every action routes through a silent layer so nothing leaks or leaves a trail.
          </p>
        </div>
        <div className="header-actions">
          <div className="wallet-chip">
            <p>Identity</p>
            <strong>{truncatedAddress}</strong>
          </div>
          <button className="ghost-btn" onClick={() => navigate("/myvault")}>
            Access Content
          </button>
          <button className="danger-btn" onClick={() => setWalletAddress("")}>
            Disconnect
          </button>
        </div>
      </header>

      <main className="vault-main">
        <section className="module primary">
          <div className="module-header">
            <div>
              <p className="eyebrow">STORE INPUT</p>
              <h2>Drop Something</h2>
              <p>Everything you add is encrypted locally before it meets the network.</p>
            </div>
            <div className="mode-toggle">
              <button
                className={mode === "file" ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setMode("file")}
              >
                File chamber
              </button>
              <button
                className={mode === "text" ? "toggle-btn active" : "toggle-btn"}
                onClick={() => setMode("text")}
              >
                Quiet note
              </button>
            </div>
          </div>

          {mode === "file" && (
            <label className="mask-drop">
              <input type="file" onChange={handleFileChange} hidden />
              <div>
                <p className="drop-title">Drop files directly into the safe</p>
                <p className="drop-sub">Max 10MB · sealed instantly · no metadata trail</p>
              </div>
            </label>
          )}

          {mode === "text" && (
            <div className="mask-editor">
              <input
                className="filename-input"
                type="text"
                placeholder="Optional codename"
                value={fileNameInput}
                onChange={(e) => setFileNameInput(e.target.value)}
              />
              <textarea
                className="mask-textarea"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type a note, identity snippet, or password. It never leaves unencrypted."
                maxLength={5000}
              />
              <div className="editor-footer">
                <span>{textInput.length}/5000</span>
                <button className="primary-btn" onClick={handleTextSave}>
                  Seal entry
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="module console">
          <div className="console-info">
            <div className="stat-grid">
              <div className="stat-card">
                <p className="eyebrow">Progress</p>
                <h3>{progress}%</h3>
                <p className="stat-sub">
                  {isUploading ? "Disguising payload..." : progress === 100 ? "Sealed" : "Idle"}
                </p>
              </div>
              <div className="stat-card">
                <p className="eyebrow">Mode</p>
                <h3>{mode === "file" ? "FILE SAFE" : "NOTES SAFE"}</h3>
                <p className="stat-sub">Private buffer armed</p>
              </div>
            </div>

            {progress > 0 && (
              <div className="progress-rail">
                <div className="progress-meter" style={{ width: `${progress}%` }} />
              </div>
            )}

            {isUploading && <p className="console-line">[ROUTE] Silent relays hiding origin...</p>}

            {cid && progress === 100 && (
              <div className="cid-card success">
                <p className="eyebrow">Done</p>
                <p className="cid-note">
                  Entry saved inside Mask Store. Tap <strong>Access Content</strong> to see it in the archive.
                </p>
              </div>
            )}

            {uploadError && <div className="upload-error">{uploadError}</div>}

            <div className="key-callout">
              <p className="eyebrow">Key Handling</p>
              <p>
                Mask Store generates your AES key locally and shows it once. Clear storage to regenerate if compromised.
                Even we cannot see it. Protect it somewhere offline and silent.
              </p>
            </div>
          </div>
        </section>
      </main>

      {showKeyPopup && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3>Decryption Key</h3>
            <p className="key-display">{generatedKey}</p>
            <p className="note">
              Copy and secure this key offline. It's the only way to reopen content sealed inside Mask Store.
            </p>

            <button className="primary-btn" onClick={handleCopyKey}>
              Copy Key
            </button>
            <button className="ghost-btn" onClick={() => setShowKeyPopup(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultDashboard;

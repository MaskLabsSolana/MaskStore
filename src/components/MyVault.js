import React, { useState } from "react";
import "../styles/MyVault.css";
import { useNavigate } from "react-router-dom";

const MyVault = () => {
  const navigate = useNavigate();
  const uploads = JSON.parse(localStorage.getItem("uploads") || "[]");

  const [decryptionModal, setDecryptionModal] = useState(null);
  const [decryptionKey, setDecryptionKey] = useState("");
  const [error, setError] = useState("");
  const [decryptedBlob, setDecryptedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileType, setFileType] = useState("");
  const [fileName, setFileName] = useState("decrypted_file");
  const [isDecrypting, setIsDecrypting] = useState(false);

  const handleCopy = (cid) => {
    navigator.clipboard.writeText(cid);
    alert("Copied CID to clipboard!");
  };

  const decryptContent = async (cid) => {
    setError("");
    setPreviewUrl("");
    setDecryptedBlob(null);
    setIsDecrypting(true);

    try {
      const res = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      const encryptedBuffer = await res.arrayBuffer();

      const iv = new Uint8Array(encryptedBuffer).slice(0, 12);
      const data = new Uint8Array(encryptedBuffer).slice(12);

      const cleanKey = decryptionKey.trim();
      if (!cleanKey) {
        setError("Enter the Mask Store key shown during upload.");
        return;
      }

      let binary;
      try {
        binary = Uint8Array.from(atob(cleanKey), (c) => c.charCodeAt(0));
      } catch (e) {
        setError("Invalid decryption key format. Must be a base64 string.");
        return;
      }

      const key = await crypto.subtle.importKey("raw", binary, { name: "AES-GCM" }, false, ["decrypt"]);
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);

      const uploadMeta = uploads[decryptionModal];
      const inferredType = uploadMeta.type || "application/octet-stream";
      const inferredName = uploadMeta.name || "decrypted_file";

      const blob = new Blob([decrypted], { type: inferredType });

      setFileType(inferredType);
      setFileName(inferredName);
      setDecryptedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setIsDecrypting(false);
    } catch (err) {
      console.error("Decryption failed:", err);
      setIsDecrypting(false);
      if (err?.name === "OperationError") {
        setError("Decryption failed. The key doesn't match this file or the content was altered.");
      } else {
        setError("Decryption failed. Invalid key or content.");
      }
    }
  };

  const getPreview = () => {
    if (!decryptedBlob) return null;

    const downloadButton = (
      <a href={previewUrl} download={fileName} className="download-btn">
        Download unmasked copy
      </a>
    );

    if (fileType.startsWith("image/")) {
      return (
        <>
          <img src={previewUrl} alt="Decrypted" className="preview-image" />
          {downloadButton}
        </>
      );
    } else if (fileType === "application/pdf") {
      return (
        <>
          <iframe
            title="PDF Preview"
            src={previewUrl}
            width="100%"
            height="400px"
            style={{ border: "none", marginTop: "1rem" }}
          />
          {downloadButton}
        </>
      );
    } else if (fileType.startsWith("text/")) {
      return (
        <>
          <iframe
            title="Text Preview"
            src={previewUrl}
            width="100%"
            height="300px"
            style={{ border: "1px solid #fff", marginTop: "1rem" }}
          />
          {downloadButton}
        </>
      );
    }
    return downloadButton;
  };

  return (
    <div className="archive-shell">
      <div className="vault-noise" />
      <header className="archive-header">
        <div>
          <p className="eyebrow">MASK STORE // ARCHIVE</p>
          <h1>Access Content</h1>
          <p>Every file, note, and identity you sealed lives here. Nothing leaves this page unmasked.</p>
        </div>
        <button className="ghost-btn" onClick={() => navigate(-1)}>
          Return to console
        </button>
      </header>

      <div className="archive-main">
        {uploads.length === 0 ? (
          <div className="empty-state">
            <p>No stored items yet. Drop something into Mask Store to see it appear here.</p>
          </div>
        ) : (
          <div className="archive-grid">
            {uploads.map((item, idx) => (
              <div className="archive-card" key={idx}>
                <div className="card-meta">
                  <p className="eyebrow">{item.type || "Unknown type"}</p>
                  <h3>{item.name}</h3>
                </div>
                <p className="cid-label">CID</p>
                <p className="cid-value">{item.cid}</p>
                <div className="card-actions">
                  <button className="outline-btn" onClick={() => handleCopy(item.cid)}>
                    Copy CID
                  </button>
                  <button className="primary-btn ghost" onClick={() => setDecryptionModal(idx)}>
                    Unlock
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {decryptionModal !== null && (
        <div className="decrypt-modal">
          <div className="decrypt-content">
            <h3>Unlock Stored Content</h3>
            <input
              type="text"
              placeholder="Enter Mask Store key"
              value={decryptionKey}
              onChange={(e) => setDecryptionKey(e.target.value)}
            />
            <button
              className="primary-btn"
              onClick={() => decryptContent(uploads[decryptionModal].cid)}
              disabled={isDecrypting}
            >
              {isDecrypting ? "Decrypting..." : "Decrypt"}
            </button>
            {isDecrypting && <div className="decrypt-spinner">Decrypting payload...</div>}
            {error && <p className="error-text">{error}</p>}
            {getPreview()}
            <button
              className="ghost-btn"
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setDecryptionModal(null);
                setDecryptionKey("");
                setDecryptedBlob(null);
                setPreviewUrl("");
                setError("");
                setFileType("");
                setFileName("decrypted_file");
                setIsDecrypting(false);
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyVault;

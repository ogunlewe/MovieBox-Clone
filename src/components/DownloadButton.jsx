import React, { useState } from "react";

const DownloadButton = ({ magnetLink }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadUrl(""); // Reset previous download URL

    try {
      const response = await fetch(
        `http://localhost:5000/stream?magnet=${encodeURIComponent(magnetLink)}`
      );
      if (!response.ok) throw new Error("Failed to start torrent stream");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Error starting the download.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        onClick={handleDownload}
        disabled={downloading}
        className={`w-full flex items-center justify-center gap-2 ${
          downloading ? "bg-gray-600" : "bg-[#f47521] hover:bg-[#ff8534]"
        } text-white px-4 py-2 rounded-md transition-all duration-300 text-sm font-medium`}
      >
        {downloading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Downloading</span>
          </>
        ) : (
          <>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>Download</span>
          </>
        )}
      </button>

      {downloading && (
        <div className="mt-2">
          <div className="h-1 bg-[#1A1A1F] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#f47521] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 mt-1">{progress}%</span>
        </div>
      )}

      {downloadUrl && (
        <a
          href={downloadUrl}
          download="movie.mp4"
          className="mt-2 text-blue-500 underline"
        >
          Click here if the download doesn't start automatically.
        </a>
      )}
    </div>
  );
};

export default DownloadButton;

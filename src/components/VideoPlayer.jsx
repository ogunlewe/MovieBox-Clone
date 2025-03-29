import React, { useState, useEffect } from "react";

const VideoPlayer = ({ magnetLink, onClose }) => {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (magnetLink) {
      // Construct the streaming URL using the server endpoint.
      const streamUrl = `http://localhost:5000/stream?magnet=${encodeURIComponent(
        magnetLink
      )}`;
      setVideoUrl(streamUrl);
      setLoading(false);
    }
  }, [magnetLink]);

  if (!magnetLink) return null; 

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col">
      {/* Header Section */}
      <header className="flex justify-between items-center p-4 bg-gray-900">
        <h1 className="text-2xl font-bold text-white">Now Playing</h1>
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors duration-200 flex items-center gap-2"
        >
          <span className="material-icons"></span>
          Close
        </button>
      </header>

      {/* Video Player Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-lg">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            ) : (
              <video
                controls
                autoPlay
                src={videoUrl}
                className="w-full h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>

          {/* Placeholder for Episodes/Related Content */}
          <div className="mt-6 text-white">
            <h2 className="text-xl font-semibold mb-2">
              Episodes / Related Films
            </h2>
            <p className="text-gray-300">
              {/* Replace this with your episodes or related content UI */}
              Content goes here...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;

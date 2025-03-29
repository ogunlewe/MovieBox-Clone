import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 mb-6 hover:text[#f47521] transition-colors duration-200 "
        >
          <span className="material-icons text-2xl">arrow_back</span>
          <span>Back</span>
        </button>
        {/* Profile Header */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-20 h-20 rounded-full bg-[#f47521] flex items-center justify-center text-2xl font-bold">
            {user?.displayName
              ? user.displayName[0].toUpperCase()
              : user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {user?.displayName || "User"}
            </h1>
            <p className="text-gray-400">{user?.email}</p>
            <p className="text-sm text-gray-500">
              User ID: {user?.uid.slice(0, 8)}...
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-[#1A1A1F] p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-[#f47521]">0</p>
            <p className="text-sm text-gray-400">Watched</p>
          </div>
          <div className="bg-[#1A1A1F] p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-[#f47521]">0</p>
            <p className="text-sm text-gray-400">Watchlist</p>
          </div>
          <div className="bg-[#1A1A1F] p-4 rounded-lg text-center">
            <p className="text-2xl font-bold text-[#f47521]">0</p>
            <p className="text-sm text-gray-400">Downloads</p>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-[#1A1A1F] rounded-lg p-4 mb-4">
          <h2 className="text-lg font-semibold mb-4">Account Details</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Email</p>
              <p>{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Account Created</p>
              <p>{user?.metadata.creationTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

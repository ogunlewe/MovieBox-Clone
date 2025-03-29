import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Settings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const menuItems = [
    {
      label: "Profile",
      icon: "person",
      onClick: () => navigate("/profile"),
    },
    {
      label: "Quality Settings",
      icon: "high_quality",
      onClick: () => navigate("/settings/quality"),
    },
    {
      label: "Data Saving",
      icon: "data_saver_on",
      onClick: () => navigate("/settings/data"),
    },
    {
      label: "Downloads",
      icon: "download",
      onClick: () => navigate("/settings/downloads"),
    },
    {
      label: "Sign Out",
      icon: "logout",
      onClick: handleSignOut,
      className: "text-red-500",
    },
  ];

  return (
    <div className="relative">
    {/* Settings Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 text-white hover:text-[#f47521] transition-colors p-2 rounded-full"
        >
          <span className="material-icons mr-10 text-5xl" >settings</span>
        </button>

        {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-[#1A1A1F] rounded-lg shadow-xl py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-sm font-medium text-white">
              {user?.displayName || user?.email}
            </p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-[#f47521] hover:text-white transition-colors ${
                  item.className || "text-white"
                }`}
              >
                <span className="material-icons text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

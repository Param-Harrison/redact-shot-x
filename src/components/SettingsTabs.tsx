import React from 'react';

interface SettingsTabsProps {
  selectedTab: "redaction" | "advanced";
  setSelectedTab: (tab: "redaction" | "advanced") => void;
}

const SettingsTabs: React.FC<SettingsTabsProps> = ({ 
  selectedTab, 
  setSelectedTab 
}) => {
  return (
    <div className="settings-tabs">
      <button 
        className={selectedTab === "redaction" ? "tab-active" : ""}
        onClick={() => setSelectedTab("redaction")}
      >
        Redaction
      </button>
      <button 
        className={selectedTab === "advanced" ? "tab-active" : ""}
        onClick={() => setSelectedTab("advanced")}
      >
        Advanced
      </button>
    </div>
  );
};

export default SettingsTabs; 
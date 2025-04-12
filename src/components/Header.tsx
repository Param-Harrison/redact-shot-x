import React from 'react';
import IconButton from './IconButton';

interface HeaderProps {
  openSettings: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ openSettings, darkMode, toggleDarkMode }) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="app-branding">
          <h1>RedactShotX</h1>
          <p className="tagline">Effortlessly redact sensitive information from images</p>
        </div>
        <div className="header-actions">
          <IconButton 
            onClick={toggleDarkMode}
            ariaLabel={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className="dark-mode-toggle"
            tooltipPosition="bottom"
          >
            {darkMode ? (
              <svg className="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="M5 5l1.5 1.5"></path>
                <path d="M17.5 17.5l1.5 1.5"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="M5 19l1.5-1.5"></path>
                <path d="M17.5 6.5l1.5-1.5"></path>
              </svg>
            ) : (
              <svg className="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </IconButton>
          <IconButton 
            onClick={openSettings}
            ariaLabel="Open settings"
            title="Customize redaction settings"
            className="settings-button"
            tooltipPosition="left"
          >
            <svg className="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </IconButton>
        </div>
      </div>
    </header>
  );
};

export default Header; 
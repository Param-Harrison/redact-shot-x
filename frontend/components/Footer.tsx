import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="footer-item">RedactShotX</span>
        <span className="footer-separator">•</span>
        <span className="footer-item">Local-only PII redaction</span>
        <span className="footer-separator">•</span>
        <span className="footer-item">No data leaves your device</span>
      </div>
    </footer>
  );
};

export default Footer; 
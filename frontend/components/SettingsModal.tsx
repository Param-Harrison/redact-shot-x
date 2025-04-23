import React, { useState, useEffect } from 'react';
import IconButton from './IconButton';

// Simple Toast notification component
const Toast = ({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 1000); // Auto-hide after 1 second
      
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);
  
  if (!visible) return null;
  
  return (
    <div className="toast-notification">
      <div className="toast-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
};

// Define the types for enabled redaction types
export type EnabledTypesRecord = {
  CUSTOM_REGEX: boolean;
  DENY_LIST: boolean;
  ALLOW_LIST: boolean;
  BULK_UPLOAD: boolean;
  [key: string]: boolean;
};

export interface SettingsModalProps {
  isOpen: boolean;
  closeSettings: () => void;
  // Redaction settings
  redactionMethod?: "blur" | "box";
  setRedactionMethod?: (method: "blur" | "box") => void;
  enabledTypes: EnabledTypesRecord;
  toggleRedactionType: (type: keyof EnabledTypesRecord) => void;
  
  // Custom settings
  allowListTags: string[];
  denyListTags: string[];
  allowListInput: string;
  denyListInput: string;
  regexPatternInput: string;
  setAllowListInput: (input: string) => void;
  setDenyListInput: (input: string) => void;
  setRegexPatternInput: (input: string) => void;
  addAllowListTag: () => void;
  addDenyListTag: () => void;
  removeAllowListTag: (tag: string) => void;
  removeDenyListTag: (tag: string) => void;
  handleAllowListKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleDenyListKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  allowListInputRef: React.RefObject<HTMLInputElement>;
  denyListInputRef: React.RefObject<HTMLInputElement>;
  regexPatternInputRef: React.RefObject<HTMLInputElement>;
  
  // Custom regex related props
  customRegexes: string[];
  addCustomRegex?: () => void;
  removeCustomRegex?: (regex: string) => void;
  handleCustomRegexKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  setCustomRegexes?: (val: string[]) => void;
  
  // App settings
  darkMode?: boolean;
  toggleDarkMode?: () => void;
  usePartialMatching?: boolean;
  setUsePartialMatching?: (value: boolean) => void;
}

// Setting Item component for consistent layout
const SettingItem = ({ 
  title, 
  description, 
  children,
  className
}: { 
  title: React.ReactNode, 
  description: string, 
  children: React.ReactNode,
  className?: string
}) => (
  <div className={`setting-item ${className || ''}`}>
    <div className="setting-item-text">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    <div className="setting-item-control">
      {children}
    </div>
  </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  closeSettings,
  enabledTypes,
  toggleRedactionType,
  allowListTags,
  denyListTags,
  allowListInput,
  denyListInput,
  regexPatternInput,
  setAllowListInput,
  setDenyListInput,
  setRegexPatternInput,
  addAllowListTag,
  addDenyListTag,
  removeAllowListTag,
  removeDenyListTag,
  handleAllowListKeyPress,
  handleDenyListKeyPress,
  allowListInputRef,
  denyListInputRef,
  regexPatternInputRef,
  customRegexes = [],
  addCustomRegex,
  removeCustomRegex,
  handleCustomRegexKeyPress,
  darkMode = false,
}) => {
  const [toastVisible, setToastVisible] = useState(false);
  
  // Handle backspace key for tag inputs
  const handleBackspaceDelete = (
    e: React.KeyboardEvent<HTMLInputElement>,
    tags: string[],
    inputValue: string,
    removeTag: (tag: string) => void
  ) => {
    // Only process backspace if input is empty and there are tags
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      // Remove the last tag
      removeTag(tags[tags.length - 1]);
    }
  };

  // Add handlers for each tag input type
  const handleAllowListKeyPressWithBackspace = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleAllowListKeyPress(e);
    handleBackspaceDelete(e, allowListTags, allowListInput, removeAllowListTag);
  };

  const handleDenyListKeyPressWithBackspace = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleDenyListKeyPress(e);
    handleBackspaceDelete(e, denyListTags, denyListInput, removeDenyListTag);
  };

  const handleCustomRegexKeyPressWithBackspace = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (handleCustomRegexKeyPress) {
      handleCustomRegexKeyPress(e);
    }
    if (removeCustomRegex) {
      handleBackspaceDelete(e, customRegexes, regexPatternInput, removeCustomRegex);
    }
  };

  // Handle save and close with toast notification
  const handleSaveAndClose = () => {
    setToastVisible(true);
    // Wait for the toast to complete before closing the modal
    setTimeout(() => {
      setToastVisible(false);
      closeSettings();
    }, 1500); // Close modal after 1.5 seconds (toast shows for 1 second)
  };

  if (!isOpen) return null;
  
  return (
    <div className="settings-modal-overlay" onClick={closeSettings}>
      <div className={`settings-modal ${darkMode ? 'dark-mode' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Redaction Settings</h2>
          <IconButton 
            onClick={closeSettings} 
            ariaLabel="Close settings"
            className="close-button"
            title="Close settings panel"
            tooltipPosition="left"
          >
            <svg className="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </IconButton>
        </div>
        
        <div className="settings-modal-content">
          <div className="settings-panel">
            <div className="redaction-settings">
              <h3 className="settings-section-title">Premium Features</h3>
              
              <SettingItem
                title={<>Bulk Image Upload <span className="premium-badge"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>Premium</span></>} 
                description="Enable uploading and processing multiple images at once"
                className="premium"
              >
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={enabledTypes.BULK_UPLOAD || false}
                    onChange={() => toggleRedactionType('BULK_UPLOAD')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </SettingItem>
              
              <h3 className="settings-section-title">Custom Rules</h3>
              
              {/* Custom Regex */}
              <SettingItem
                title="Custom Regex Pattern"
                description="Create your own pattern to detect specific types of information"
              >
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={enabledTypes.CUSTOM_REGEX}
                    onChange={() => toggleRedactionType('CUSTOM_REGEX')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </SettingItem>
              
              {enabledTypes.CUSTOM_REGEX && (
                <div className="setting-addon">
                  <div className="tag-input-container">
                    <div className="tag-input-wrapper">
                      <div className="tag-list">
                        {customRegexes.map((regex, index) => (
                          <div key={index} className="tag regex-tag">
                            <span>{regex}</span>
                            <button 
                              type="button" 
                              onClick={() => removeCustomRegex && removeCustomRegex(regex)}
                              className="tag-remove"
                              aria-label={`Remove ${regex} from custom regex patterns`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <input
                          type="text"
                          ref={regexPatternInputRef}
                          value={regexPatternInput}
                          onChange={(e) => setRegexPatternInput(e.target.value)}
                          onKeyDown={handleCustomRegexKeyPressWithBackspace}
                          placeholder="Enter regex pattern..."
                          className="tag-input"
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={addCustomRegex}
                      className="tag-add-button"
                      disabled={!regexPatternInput.trim()}
                    >
                      Add
                    </button>
                  </div>
                  <p className="input-hint">Enter a pattern and press Enter or click Add button. Examples: \d{3}-\d{2}-\d{4} (SSN), [A-Z]{2}\d{6} (passport), (Dr|Mr|Mrs)\.\s[A-Z][a-z]+ (titles)</p>
                </div>
              )}
              
              <div className="settings-section-title">Exemptions</div>
              
              <SettingItem
                title="Allow List" 
                description="Words in this list will never be redacted, even if they match a PII pattern"
              >
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={enabledTypes.ALLOW_LIST}
                    onChange={() => toggleRedactionType('ALLOW_LIST')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </SettingItem>
              
              {enabledTypes.ALLOW_LIST && (
                <div className="setting-addon">
                  <div className="tag-input-container">
                    <div className="tag-input-wrapper">
                      <div className="tag-list">
                        {allowListTags.map((tag, index) => (
                          <div key={index} className="tag allow-tag">
                            <span>{tag}</span>
                            <button 
                              type="button" 
                              onClick={() => removeAllowListTag(tag)}
                              className="tag-remove"
                              aria-label={`Remove ${tag} from allowlist`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <input
                          type="text"
                          ref={allowListInputRef}
                          value={allowListInput}
                          onChange={(e) => setAllowListInput(e.target.value)}
                          onKeyDown={handleAllowListKeyPressWithBackspace}
                          placeholder="Enter word or phrase..."
                          className="tag-input"
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={addAllowListTag}
                      className="tag-add-button"
                      disabled={!allowListInput.trim()}
                    >
                      Add
                    </button>
                  </div>
                  <p className="input-hint">Enter text and press Enter, comma, or click Add</p>
                </div>
              )}
              
              <SettingItem
                title="Deny List" 
                description="Words in this list will always be redacted, regardless of whether they match a PII pattern"
              >
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={enabledTypes.DENY_LIST}
                    onChange={() => toggleRedactionType('DENY_LIST')}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </SettingItem>
              
              {enabledTypes.DENY_LIST && (
                <div className="setting-addon">
                  <div className="tag-input-container">
                    <div className="tag-input-wrapper">
                      <div className="tag-list">
                        {denyListTags.map((tag, index) => (
                          <div key={index} className="tag deny-tag">
                            <span>{tag}</span>
                            <button 
                              type="button" 
                              onClick={() => removeDenyListTag(tag)}
                              className="tag-remove"
                              aria-label={`Remove ${tag} from denylist`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <input
                          type="text"
                          ref={denyListInputRef}
                          value={denyListInput}
                          onChange={(e) => setDenyListInput(e.target.value)}
                          onKeyDown={handleDenyListKeyPressWithBackspace}
                          placeholder="Enter word or phrase..."
                          className="tag-input"
                        />
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={addDenyListTag}
                      className="tag-add-button"
                      disabled={!denyListInput.trim()}
                    >
                      Add
                    </button>
                  </div>
                  <p className="input-hint">Enter text and press Enter, comma, or click Add</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="settings-modal-footer">
          <button className="secondary-button" onClick={closeSettings}>
            Close
          </button>
          <button className="primary-button" onClick={handleSaveAndClose}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            Save & Close
          </button>
        </div>
      </div>
      
      <Toast 
        message="Settings saved successfully!" 
        visible={toastVisible} 
        onClose={() => setToastVisible(false)} 
      />
    </div>
  );
};

export default SettingsModal; 
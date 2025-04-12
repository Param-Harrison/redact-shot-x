import React, { useState, useEffect } from 'react';
import SettingsTabs from './SettingsTabs';
import IconButton from './IconButton';

// Simple Toast notification component
const Toast = ({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Auto-hide after 3 seconds
      
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
  PERSON: boolean;
  EMAIL_ADDRESS: boolean;
  PHONE_NUMBER: boolean;
  URL: boolean;
  US_SSN: boolean;
  US_ITIN: boolean;
  US_PASSPORT: boolean;
  CREDIT_CARD: boolean;
  IBAN_CODE: boolean;
  IP_ADDRESS: boolean;
  MAC_ADDRESS: boolean;
  US_BANK_ACCOUNT: boolean;
  US_BANK_ROUTING: boolean;
  STREET_ADDRESS: boolean;
  ZIPCODE: boolean;
  LOCATION: boolean;
  DATE: boolean;
  CUSTOM_REGEX: boolean;
  DENY_LIST: boolean;
  ALLOW_LIST: boolean;
  [key: string]: boolean;
};

export interface SettingsModalProps {
  isOpen: boolean;
  closeSettings: () => void;
  // Redaction settings
  redactionMethod: "blur" | "box";
  setRedactionMethod: (method: "blur" | "box") => void;
  enabledTypes: EnabledTypesRecord;
  toggleRedactionType: (type: keyof EnabledTypesRecord) => void;
  showRedactionCount: boolean;
  setShowRedactionCount: (show: boolean) => void;
  
  // Advanced settings
  allowListTags: string[];
  denyListTags: string[];
  allowListInput: string;
  denyListInput: string;
  regexPatternInput: string;
  useContextEnhancement: boolean;
  isDicomImage: boolean;
  setAllowListInput: (input: string) => void;
  setDenyListInput: (input: string) => void;
  setRegexPatternInput: (input: string) => void;
  setUseContextEnhancement: (use: boolean) => void;
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
  setCustomRegexes: (val: string[]) => void;
  
  // Common props
  activeTooltip: string | null;
  showTooltip: (tooltipId: string) => void;
  hideTooltip: () => void;
  tooltips: Record<string, string>;
  selectedTab: "redaction" | "advanced";
  setSelectedTab: (tab: "redaction" | "advanced") => void;
  darkMode?: boolean;
}

// Format PII type name to display properly
const formatPiiTypeName = (type: string): string => {
  switch (type) {
    case 'PERSON': return 'Person Names';
    case 'EMAIL_ADDRESS': return 'Email Addresses';
    case 'PHONE_NUMBER': return 'Phone Numbers';
    case 'URL': return 'URLs';
    case 'US_SSN': return 'SSN';
    case 'US_ITIN': return 'ITIN';
    case 'US_PASSPORT': return 'US Passport Numbers';
    case 'CREDIT_CARD': return 'Credit Card Numbers';
    case 'IBAN_CODE': return 'IBAN Codes';
    case 'IP_ADDRESS': return 'IP Addresses';
    case 'MAC_ADDRESS': return 'MAC Addresses';
    case 'US_BANK_ACCOUNT': return 'US Bank Account Numbers';
    case 'US_BANK_ROUTING': return 'US Bank Routing Numbers';
    case 'US_DRIVER_LICENSE': return 'US Driver License Numbers';
    case 'STREET_ADDRESS': return 'Street Addresses';
    case 'ZIPCODE': return 'ZIP Codes';
    case 'LOCATION': return 'Location Names';
    case 'DATE': return 'Dates';
    case 'MEDICAL_LICENSE': return 'Medical License Numbers';
    case 'DOMAIN_NAME': return 'Domain Names';
    case 'URL': return 'URLs';
    case 'NRP': return 'NRP (National Provider Identifier) Numbers';
    default: return type.replace(/_/g, ' ');
  }
};

// Descriptions for each PII type
const getDescriptionForPiiType = (type: string): string => {
  switch (type) {
    case 'PERSON': return 'Redact names of people in text';
    case 'EMAIL_ADDRESS': return 'Redact email addresses (name@domain.com)';
    case 'PHONE_NUMBER': return 'Redact phone numbers in various formats';
    case 'URL': return 'Redact web addresses and URLs';
    case 'US_SSN': return 'Redact Social Security Numbers (XXX-XX-XXXX)';
    case 'US_ITIN': return 'Redact Individual Taxpayer Identification Numbers';
    case 'US_PASSPORT': return 'Redact US passport numbers';
    case 'CREDIT_CARD': return 'Redact credit card numbers';
    case 'IBAN_CODE': return 'Redact International Bank Account Numbers';
    case 'IP_ADDRESS': return 'Redact IPv4 and IPv6 addresses';
    case 'MAC_ADDRESS': return 'Redact MAC addresses of network devices';
    case 'US_BANK_ACCOUNT': return 'Redact US bank account numbers';
    case 'US_BANK_ROUTING': return 'Redact ABA routing numbers';
    case 'STREET_ADDRESS': return 'Redact street addresses';
    case 'ZIPCODE': return 'Redact ZIP and postal codes';
    case 'LOCATION': return 'Redact locations, cities, and place names';
    case 'DATE': return 'Redact dates in various formats';
    case 'MEDICAL_LICENSE': return 'Redact medical license numbers';
    case 'DOMAIN_NAME': return 'Redact domain names';
    case 'URL': return 'Redact web addresses and URLs';
    case 'NRP': return 'Redact NRP (National Provider Identifier) numbers';
    
    default: return `Redact ${type.toLowerCase().replace(/_/g, ' ')}`;
  }
};

// Setting Item component for consistent layout
const SettingItem = ({ 
  title, 
  description, 
  children 
}: { 
  title: string, 
  description: string, 
  children: React.ReactNode 
}) => (
  <div className="setting-item">
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
  redactionMethod,
  setRedactionMethod,
  enabledTypes,
  toggleRedactionType,
  showRedactionCount,
  setShowRedactionCount,
  allowListTags,
  denyListTags,
  allowListInput,
  denyListInput,
  regexPatternInput,
  useContextEnhancement,
  isDicomImage,
  setAllowListInput,
  setDenyListInput,
  setRegexPatternInput,
  setUseContextEnhancement,
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
  activeTooltip,
  showTooltip,
  hideTooltip,
  tooltips,
  selectedTab,
  setSelectedTab,
  darkMode = false
}) => {
  const [toastVisible, setToastVisible] = useState(false);
  
  // Add function to position tooltips intelligently
  const getTooltipPosition = (tooltipId: string) => {
    const element = document.getElementById(`tooltip-trigger-${tooltipId}`);
    if (!element) return 'center-aligned';
    
    const rect = element.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    
    // More sophisticated positioning:
    // - If near left edge (first 25% of screen): left-aligned
    // - If near right edge (last 25% of screen): right-aligned
    // - If in middle: center-aligned
    if (rect.left < windowWidth * 0.25) {
      return 'left-aligned';
    } else if (rect.left > windowWidth * 0.75) {
      return 'right-aligned';
    } else {
      return 'center-aligned';
    }
  };

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
    // Still call closeSettings but with a slight delay to show toast
    setTimeout(() => {
      closeSettings();
    }, 1000);
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
          <SettingsTabs 
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
          />
          
          <div className="settings-panel">
            {selectedTab === "redaction" && (
              <div className="redaction-settings">
                <h3 className="settings-section-title">Basic Options</h3>
                
                <div className="redaction-method-container">
                  <div className="redaction-method-header">
                    <h3>Redaction Method</h3>
                    <p>Choose how sensitive information will be hidden in the image</p>
                  </div>
                  <div className="redaction-method-options">
                    <button 
                      className={`redaction-method-option ${redactionMethod === "blur" ? "active" : ""}`}
                      onClick={() => setRedactionMethod("blur")}
                      aria-pressed={redactionMethod === "blur"}
                    >
                      Blur
                    </button>
                    <button 
                      className={`redaction-method-option ${redactionMethod === "box" ? "active" : ""}`}
                      onClick={() => setRedactionMethod("box")}
                      aria-pressed={redactionMethod === "box"}
                    >
                      Black Box
                    </button>
                  </div>
                </div>

                <SettingItem
                  title="Show Redaction Count"
                  description="Display the number of sensitive items redacted in the image"
                >
                  <label className="toggle-switch">
                    <input 
                      type="checkbox" 
                      checked={showRedactionCount}
                      onChange={() => setShowRedactionCount(!showRedactionCount)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </SettingItem>

                <h3 className="settings-section-title">Redaction Types</h3>
                
                {/* Common PII Types */}
                <div className="pii-toggles">
                  {Object.keys(enabledTypes)
                    .filter(type => !['IP_ADDRESS', 'DOMAIN_NAME', 'URL', 'NRP', 'MEDICAL_LICENSE', 'CUSTOM_REGEX', 'DENY_LIST', 'MAC_ADDRESS', 'US_BANK_ROUTING', 'ALLOW_LIST'].includes(type))
                    .map(type => (
                      <SettingItem
                        key={type}
                        title={formatPiiTypeName(type)}
                        description={getDescriptionForPiiType(type)}
                      >
                        <div className="setting-item-actions">
                          {tooltips[type.toLowerCase()] && (
                            <div className="tooltip-container">
                              <div
                                id={`tooltip-trigger-${type}`}
                                className="info-icon"
                                onMouseEnter={() => showTooltip(type)}
                                onMouseLeave={hideTooltip}
                              >
                                ?
                              </div>
                              {activeTooltip === type && (
                                <div className={`tooltip ${getTooltipPosition(type)}`}>
                                  {tooltips[type.toLowerCase()]}
                                </div>
                              )}
                            </div>
                          )}
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={enabledTypes[type]}
                              onChange={() => toggleRedactionType(type as keyof EnabledTypesRecord)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </SettingItem>
                    ))}
                </div>
              </div>
            )}

            {selectedTab === "advanced" && (
              <div className="advanced-settings">
                <h3 className="settings-section-title">Advanced PII Types</h3>
                
                {/* Advanced PII Types */}
                <div className="pii-toggles">
                  {Object.keys(enabledTypes)
                    .filter(type => ['IP_ADDRESS', 'DOMAIN_NAME', 'URL', 'NRP', 'MEDICAL_LICENSE', 'MAC_ADDRESS', 'US_BANK_ROUTING'].includes(type))
                    .map(type => (
                      <SettingItem
                        key={type}
                        title={formatPiiTypeName(type)}
                        description={getDescriptionForPiiType(type)}
                      >
                        <div className="setting-item-actions">
                          {tooltips[type.toLowerCase()] && (
                            <div className="tooltip-container">
                              <div
                                id={`tooltip-trigger-${type}`}
                                className="info-icon"
                                onMouseEnter={() => showTooltip(type)}
                                onMouseLeave={hideTooltip}
                              >
                                ?
                              </div>
                              {activeTooltip === type && (
                                <div className={`tooltip ${getTooltipPosition(type)}`}>
                                  {tooltips[type.toLowerCase()]}
                                </div>
                              )}
                            </div>
                          )}
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={enabledTypes[type]}
                              onChange={() => toggleRedactionType(type as keyof EnabledTypesRecord)}
                            />
                            <span className="toggle-slider"></span>
                          </label>
                        </div>
                      </SettingItem>
                    ))}
                </div>

                <h3 className="settings-section-title">Custom Rules</h3>
                
                <SettingItem
                  title="Context Enhancement"
                  description="Analyzes surrounding text to improve accuracy of PII detection"
                >
                  <div className="setting-item-actions">
                    <div className="tooltip-container">
                      <div
                        id="tooltip-trigger-contextEnhancement"
                        className="info-icon"
                        onMouseEnter={() => showTooltip('contextEnhancement')}
                        onMouseLeave={hideTooltip}
                      >
                        ?
                      </div>
                      {activeTooltip === 'contextEnhancement' && (
                        <div className={`tooltip ${getTooltipPosition('contextEnhancement')}`}>
                          {tooltips.contextEnhancement}
                        </div>
                      )}
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={useContextEnhancement}
                        onChange={() => setUseContextEnhancement(!useContextEnhancement)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </SettingItem>

                {/* Custom Regex */}
                <SettingItem
                  title="Custom Regex Pattern"
                  description="Create your own pattern to detect specific types of information"
                >
                  <div className="setting-item-actions">
                    <div className="tooltip-container">
                      <div
                        id="tooltip-trigger-customRegex"
                        className="info-icon"
                        onMouseEnter={() => showTooltip('customRegex')}
                        onMouseLeave={hideTooltip}
                      >
                        ?
                      </div>
                      {activeTooltip === 'customRegex' && (
                        <div className={`tooltip ${getTooltipPosition('customRegex')}`}>
                          {tooltips.customRegex}
                        </div>
                      )}
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={enabledTypes.CUSTOM_REGEX}
                        onChange={() => toggleRedactionType('CUSTOM_REGEX')}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
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
                
                {isDicomImage && (
                  <div className="alert-box">
                    <h4>DICOM Image Detected</h4>
                    <p>Only pixel data will be redacted. DICOM metadata should be processed separately for complete de-identification.</p>
                  </div>
                )}
              </div>
            )}
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
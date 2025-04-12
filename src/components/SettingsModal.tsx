import React, { useState } from 'react';
import SettingsTabs from './SettingsTabs';
import IconButton from './IconButton';

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
  
  // Common props
  activeTooltip: string | null;
  showTooltip: (tooltipId: string) => void;
  hideTooltip: () => void;
  tooltips: Record<string, string>;
  selectedTab: "redaction" | "advanced";
  setSelectedTab: (tab: "redaction" | "advanced") => void;
  customRegexes: string[];
  setCustomRegexes: (val: string[]) => void;
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
  useContextEnhancement,
  isDicomImage,
  setAllowListInput,
  setDenyListInput,
  setUseContextEnhancement,
  addAllowListTag,
  addDenyListTag,
  removeAllowListTag,
  removeDenyListTag,
  handleAllowListKeyPress,
  handleDenyListKeyPress,
  allowListInputRef,
  denyListInputRef,
  activeTooltip,
  showTooltip,
  hideTooltip,
  tooltips,
  selectedTab,
  setSelectedTab,
  darkMode = false
}) => {
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
                
                <SettingItem 
                  title="Redaction Method" 
                  description="Choose how sensitive information will be hidden in the image"
                >
                  <div className="toggle-buttons">
                    <button 
                      className={redactionMethod === "blur" ? "active" : ""}
                      onClick={() => setRedactionMethod("blur")}
                      aria-pressed={redactionMethod === "blur"}
                    >
                      Blur
                    </button>
                    <button 
                      className={redactionMethod === "box" ? "active" : ""}
                      onClick={() => setRedactionMethod("box")}
                      aria-pressed={redactionMethod === "box"}
                    >
                      Black Box
                    </button>
                  </div>
                </SettingItem>

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
                    .filter(type => !['IP_ADDRESS', 'DOMAIN_NAME', 'URL', 'NRP', 'MEDICAL_LICENSE', 'CUSTOM_REGEX', 'DENY_LIST', 'MAC_ADDRESS', 'US_BANK_ROUTING'].includes(type))
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
                
                <div className="settings-section-title">Exemptions</div>
                
                <SettingItem
                  title="Allow List" 
                  description="Words in this list will never be redacted, even if they match a PII pattern"
                >
                  <div className="tag-input-container">
                    <div className="tag-input-wrapper">
                      <div className="tag-list">
                        {allowListTags.map((tag, index) => (
                          <div key={index} className="tag">
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
                          onKeyDown={handleAllowListKeyPress}
                          placeholder="Type and press Enter to add..."
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
                  <p className="input-hint">Press Enter or comma to add each term</p>
                </SettingItem>
                
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
                            onKeyDown={handleDenyListKeyPress}
                            placeholder="Type and press Enter to add..."
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
                    <p className="input-hint">Press Enter or comma to add each term</p>
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
          <button className="primary-button" onClick={closeSettings}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 
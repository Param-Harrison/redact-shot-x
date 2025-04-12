import React from 'react';
import SettingsTabs from './SettingsTabs';
import RedactionOptions from './RedactionOptions';
import AdvancedOptions from './AdvancedOptions';

type EnabledTypesRecord = {
  PERSON: boolean;
  EMAIL_ADDRESS: boolean;
  PHONE_NUMBER: boolean;
  CREDIT_CARD: boolean;
  US_SSN: boolean;
  LOCATION: boolean;
  ADDRESS: boolean;
  IBAN_CODE: boolean;
  US_BANK_NUMBER: boolean;
  US_DRIVER_LICENSE: boolean;
  US_PASSPORT: boolean;
  US_ITIN: boolean;
  DATE_TIME: boolean;
  IP_ADDRESS: boolean;
  DOMAIN_NAME: boolean;
  URL: boolean;
  NRP: boolean;
  MEDICAL_LICENSE: boolean;
  CUSTOM_REGEX: boolean;
  DENY_LIST: boolean;
};

interface SettingsModalProps {
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
}

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
  activeTooltip,
  showTooltip,
  hideTooltip,
  tooltips,
  selectedTab,
  setSelectedTab
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="settings-modal-overlay" onClick={closeSettings}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={closeSettings} aria-label="Close settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="settings-modal-content">
          <SettingsTabs 
            selectedTab={selectedTab}
            setSelectedTab={setSelectedTab}
          />
          
          <div className="settings-panel">
            {selectedTab === "redaction" && (
              <RedactionOptions
                redactionMethod={redactionMethod}
                setRedactionMethod={setRedactionMethod}
                enabledTypes={enabledTypes}
                toggleRedactionType={toggleRedactionType}
                showRedactionCount={showRedactionCount}
                setShowRedactionCount={setShowRedactionCount}
                activeTooltip={activeTooltip}
                showTooltip={showTooltip}
                hideTooltip={hideTooltip}
                tooltips={tooltips}
              />
            )}

            {selectedTab === "advanced" && (
              <AdvancedOptions
                allowListTags={allowListTags}
                denyListTags={denyListTags}
                allowListInput={allowListInput}
                denyListInput={denyListInput}
                regexPatternInput={regexPatternInput}
                enabledTypes={enabledTypes}
                useContextEnhancement={useContextEnhancement}
                isDicomImage={isDicomImage}
                setAllowListInput={setAllowListInput}
                setDenyListInput={setDenyListInput}
                setRegexPatternInput={setRegexPatternInput}
                setUseContextEnhancement={setUseContextEnhancement}
                addAllowListTag={addAllowListTag}
                addDenyListTag={addDenyListTag}
                removeAllowListTag={removeAllowListTag}
                removeDenyListTag={removeDenyListTag}
                handleAllowListKeyPress={handleAllowListKeyPress}
                handleDenyListKeyPress={handleDenyListKeyPress}
                allowListInputRef={allowListInputRef}
                denyListInputRef={denyListInputRef}
                regexPatternInputRef={regexPatternInputRef}
                activeTooltip={activeTooltip}
                showTooltip={showTooltip}
                hideTooltip={hideTooltip}
                tooltips={tooltips}
                toggleRedactionType={toggleRedactionType}
              />
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
import React, { RefObject } from 'react';

// Import the same type from RedactionOptions
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

interface AdvancedOptionsProps {
  allowListTags: string[];
  denyListTags: string[];
  allowListInput: string;
  denyListInput: string;
  regexPatternInput: string;
  enabledTypes: EnabledTypesRecord;
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
  allowListInputRef: RefObject<HTMLInputElement>;
  denyListInputRef: RefObject<HTMLInputElement>;
  regexPatternInputRef: RefObject<HTMLInputElement>;
  activeTooltip: string | null;
  showTooltip: (tooltipId: string) => void;
  hideTooltip: () => void;
  tooltips: Record<string, string>;
  toggleRedactionType: (type: keyof EnabledTypesRecord) => void;
}

const AdvancedOptions: React.FC<AdvancedOptionsProps> = ({
  allowListTags,
  denyListTags,
  allowListInput,
  denyListInput,
  regexPatternInput,
  enabledTypes,
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
  toggleRedactionType
}) => {
  const customPiiTypes = ['CUSTOM_REGEX', 'DENY_LIST'];

  // Format PII type name for display
  const formatPiiType = (type: string): string => {
    return type.replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <div className="advanced-options">
      {/* Allow List */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('allowList')}
          onMouseLeave={hideTooltip}>
          <h3>Allow List (Exempted Terms)</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'allowList' && (
            <div className="tooltip">{tooltips.allowList}</div>
          )}
        </div>
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
      </div>

      {/* Context Enhancement */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('contextEnhancement')}
          onMouseLeave={hideTooltip}>
          <h3>Detection Enhancement</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'contextEnhancement' && (
            <div className="tooltip">{tooltips.contextEnhancement}</div>
          )}
        </div>
        <label className="toggle-option elegant-toggle">
          <input
            type="checkbox"
            checked={useContextEnhancement}
            onChange={() => setUseContextEnhancement(!useContextEnhancement)}
            aria-label="Toggle context enhancement"
          />
          <span className="toggle-slider"></span>
          <span>Use context for better detection</span>
        </label>
      </div>

      {/* Custom PII Detection */}
      <div className="setting-card">
        <div className="setting-header">
          <h3>Custom PII Detection</h3>
        </div>
        <div className="pii-toggles">
          {customPiiTypes.map((type) => (
            <label key={type} className="toggle-option elegant-toggle">
              <input
                type="checkbox"
                checked={enabledTypes[type as keyof EnabledTypesRecord]}
                onChange={() => toggleRedactionType(type as keyof EnabledTypesRecord)}
                aria-label={`Toggle ${type} detection`}
              />
              <span className="toggle-slider"></span>
              <span>{formatPiiType(type)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Deny List (if enabled) */}
      {enabledTypes.DENY_LIST && (
        <div className="setting-card">
          <div className="setting-header"
            onMouseEnter={() => showTooltip('denyList')}
            onMouseLeave={hideTooltip}>
            <h3>Deny List (Custom Terms)</h3>
            <div className="info-icon">?</div>
            {activeTooltip === 'denyList' && (
              <div className="tooltip">{tooltips.denyList}</div>
            )}
          </div>
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

      {/* Custom Regex (if enabled) */}
      {enabledTypes.CUSTOM_REGEX && (
        <div className="setting-card">
          <div className="setting-header"
            onMouseEnter={() => showTooltip('customRegex')}
            onMouseLeave={hideTooltip}>
            <h3>Custom Regex Pattern</h3>
            <div className="info-icon">?</div>
            {activeTooltip === 'customRegex' && (
              <div className="tooltip">{tooltips.customRegex}</div>
            )}
          </div>
          <div className="custom-input-container">
            <input
              type="text"
              ref={regexPatternInputRef}
              value={regexPatternInput}
              onChange={(e) => setRegexPatternInput(e.target.value)}
              placeholder="e.g., Project-\d{4}-\d{2}"
              className="custom-regex-input"
            />
          </div>
          <p className="input-hint">Use standard regex patterns to detect custom PII</p>
        </div>
      )}

      {/* DICOM Warning (if applicable) */}
      {isDicomImage && (
        <div className="setting-card alert-box">
          <h4>DICOM Image Detected</h4>
          <p>Only pixel data will be redacted. DICOM metadata should be processed separately for complete de-identification.</p>
        </div>
      )}
    </div>
  );
};

export default AdvancedOptions; 
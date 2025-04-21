import React from 'react';

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

interface RedactionOptionsProps {
  redactionMethod: "blur" | "box";
  setRedactionMethod: (method: "blur" | "box") => void;
  enabledTypes: EnabledTypesRecord;
  toggleRedactionType: (type: keyof EnabledTypesRecord) => void;
  showRedactionCount: boolean;
  setShowRedactionCount: (show: boolean) => void;
  activeTooltip: string | null;
  showTooltip: (tooltipId: string) => void;
  hideTooltip: () => void;
  tooltips: Record<string, string>;
}

const RedactionOptions: React.FC<RedactionOptionsProps> = ({
  redactionMethod,
  setRedactionMethod,
  enabledTypes,
  toggleRedactionType,
  showRedactionCount,
  setShowRedactionCount,
  activeTooltip,
  showTooltip,
  hideTooltip,
  tooltips
}) => {
  // Format PII type name for display with correct capitalization
  const formatPiiType = (type: string): string => {
    // Special cases for abbreviations
    if (type === 'IP_ADDRESS') return 'IP Address';
    if (type === 'US_SSN') return 'SSN';
    if (type === 'US_ITIN') return 'ITIN';
    if (type === 'IBAN_CODE') return 'IBAN';
    if (type === 'NRP') return 'NRP';
    if (type === 'URL') return 'URL';

    // General case
    return type.replace(/_/g, ' ')
      .split(' ')
      .map(word => {
        // Keep common abbreviations uppercase
        if (['ID', 'US'].includes(word)) return word;
        // Capitalize first letter of other words
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Group PII types for better organization
  const commonPiiTypes = ['PERSON', 'EMAIL_ADDRESS', 'PHONE_NUMBER', 'CREDIT_CARD', 'US_SSN'];
  const locationPiiTypes = ['LOCATION', 'ADDRESS'];
  const financialPiiTypes = ['IBAN_CODE', 'US_BANK_NUMBER'];
  const idPiiTypes = ['US_DRIVER_LICENSE', 'US_PASSPORT', 'US_ITIN'];
  const advancedPiiTypes = ['IP_ADDRESS', 'DOMAIN_NAME', 'URL', 'NRP', 'MEDICAL_LICENSE', 'DATE_TIME'];

  return (
    <div className="redaction-options">
      {/* Redaction Method */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('redactionMethod')}
          onMouseLeave={hideTooltip}>
          <h3>Redaction Method</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'redactionMethod' && (
            <div className="tooltip">{tooltips.redactionMethod}</div>
          )}
        </div>
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
      </div>

      {/* Show Redaction Count Option */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('redactionCount')}
          onMouseLeave={hideTooltip}>
          <h3>Options</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'redactionCount' && (
            <div className="tooltip">{tooltips.redactionCount}</div>
          )}
        </div>
        <label className="toggle-option elegant-toggle">
          <input
            type="checkbox"
            checked={showRedactionCount}
            onChange={() => setShowRedactionCount(!showRedactionCount)}
            aria-label="Toggle redaction count display"
          />
          <span className="toggle-slider"></span>
          <span>Show redaction count</span>
        </label>
      </div>

      {/* Common PII Detection */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('person')}
          onMouseLeave={hideTooltip}>
          <h3>Common PII Detection</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'person' && (
            <div className="tooltip">{tooltips.person}</div>
          )}
        </div>
        <div className="pii-toggles">
          {commonPiiTypes.map((type) => (
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

      {/* Location Information */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('location')}
          onMouseLeave={hideTooltip}>
          <h3>Location Information</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'location' && (
            <div className="tooltip">{tooltips.location}</div>
          )}
        </div>
        <div className="pii-toggles">
          {locationPiiTypes.map((type) => (
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

      {/* Financial Information */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('financial')}
          onMouseLeave={hideTooltip}>
          <h3>Financial Information</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'financial' && (
            <div className="tooltip">{tooltips.financial}</div>
          )}
        </div>
        <div className="pii-toggles">
          {financialPiiTypes.map((type) => (
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

      {/* Identification Documents */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('identification')}
          onMouseLeave={hideTooltip}>
          <h3>Identification Documents</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'identification' && (
            <div className="tooltip">{tooltips.identification}</div>
          )}
        </div>
        <div className="pii-toggles">
          {idPiiTypes.map((type) => (
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

      {/* Advanced PII Types */}
      <div className="setting-card">
        <div className="setting-header"
          onMouseEnter={() => showTooltip('advanced')}
          onMouseLeave={hideTooltip}>
          <h3>Advanced PII Types</h3>
          <div className="info-icon">?</div>
          {activeTooltip === 'advanced' && (
            <div className="tooltip">{tooltips.advanced}</div>
          )}
        </div>
        <div className="pii-toggles">
          {advancedPiiTypes.map((type) => (
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
    </div>
  );
};

export default RedactionOptions; 
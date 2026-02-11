import React from "react";
import "../../styles/ui.css";

const TextInput = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  disabled = false,
  inputRef,
  className = "",
  ...props
}) => {
  return (
    <div className={`ui-input-group ${className}`}>
      {label && (
        <label className="ui-input-label">
          {label}
          {required && <span style={{ color: "#dc2626" }}> *</span>}
        </label>
      )}
      <input
        ref={inputRef}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        className="ui-input"
        required={required}
        {...props}
      />
      {error && <span className="ui-input-error">{error}</span>}
    </div>
  );
};

export default TextInput;


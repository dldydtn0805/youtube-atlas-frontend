import './SearchBar.css';

export interface SearchBarOption {
  value: string;
  label: string;
}

interface SearchBarProps {
  ariaLabel: string;
  emptyLabel?: string;
  helperText?: string;
  onChange: (value: string) => void;
  options: SearchBarOption[];
  placeholderLabel?: string;
  value: string;
  disabled?: boolean;
}

function SearchBar({
  ariaLabel,
  emptyLabel = '선택 가능한 항목이 없습니다.',
  helperText,
  onChange,
  options,
  placeholderLabel,
  value,
  disabled = false,
}: SearchBarProps) {
  const hasOptions = options.length > 0;
  const selectedValue = hasOptions ? value : '';
  const shouldShowPlaceholder = hasOptions && Boolean(placeholderLabel) && !options.some((option) => option.value === value);

  return (
    <label className="search-bar" aria-label={ariaLabel}>
      {helperText ? (
        <span className="search-bar__helper">
          {helperText}
        </span>
      ) : null}
      <div className="search-bar__field">
        <select
          className="search-bar__select"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={shouldShowPlaceholder ? '' : selectedValue}
        >
          {hasOptions ? (
            <>
              {shouldShowPlaceholder ? (
                <option value="">
                  {placeholderLabel}
                </option>
              ) : null}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </>
          ) : (
            <option value="">
              {emptyLabel}
            </option>
          )}
        </select>
        <span aria-hidden="true" className="search-bar__chevron">
          ▾
        </span>
      </div>
    </label>
  );
}

export default SearchBar;

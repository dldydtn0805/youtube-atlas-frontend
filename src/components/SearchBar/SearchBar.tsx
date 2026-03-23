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
  value: string;
  disabled?: boolean;
}

function SearchBar({
  ariaLabel,
  emptyLabel = '선택 가능한 항목이 없습니다.',
  helperText,
  onChange,
  options,
  value,
  disabled = false,
}: SearchBarProps) {
  const hasOptions = options.length > 0;

  return (
    <label className="search-bar" aria-label={ariaLabel}>
      <div className="search-bar__field">
        <select
          className="search-bar__select"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          value={hasOptions ? value : ''}
        >
          {hasOptions ? (
            options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
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
      {helperText ? (
        <span className="search-bar__helper">
          {helperText}
        </span>
      ) : null}
    </label>
  );
}

export default SearchBar;

import countryCodes from '../../constants/countryCodes';
import './SearchBar.css';

type RegionCode = (typeof countryCodes)[number]['code'];

const sortedCountryCodes = [...countryCodes].sort((left, right) =>
  left.name.localeCompare(right.name, 'ko'),
);

interface SearchBarProps {
  selectedRegionCode: RegionCode;
  onSelectRegion: (regionCode: RegionCode) => void;
}

function SearchBar({ selectedRegionCode, onSelectRegion }: SearchBarProps) {
  return (
    <label className="search-bar" aria-label="국가 선택">
      <div className="search-bar__field">
        <select
          className="search-bar__select"
          onChange={(event) => onSelectRegion(event.target.value as RegionCode)}
          value={selectedRegionCode}
        >
          {sortedCountryCodes.map((country) => (
            <option key={country.code} value={country.code}>
              {`${country.code} · ${country.name}`}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="search-bar__chevron">
          ▾
        </span>
      </div>
    </label>
  );
}

export default SearchBar;

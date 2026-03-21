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
    <section className="search-bar" aria-label="국가 선택">
      {sortedCountryCodes.map((country) => (
        <button
          key={country.code}
          className="search-bar__button"
          data-active={selectedRegionCode === country.code}
          onClick={() => onSelectRegion(country.code)}
          type="button"
        >
          {country.name}
        </button>
      ))}
    </section>
  );
}

export default SearchBar;

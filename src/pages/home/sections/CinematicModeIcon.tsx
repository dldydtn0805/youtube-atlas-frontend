interface CinematicModeIconProps {
  active: boolean;
}

export default function CinematicModeIcon({ active }: CinematicModeIconProps) {
  const windowPath = active ? 'M6.4 8h11.2v4.5H6.4V8Z' : 'M7.3 8.7h9.4v3.1H7.3V8.7Z';

  return (
    <svg data-active={active ? 'true' : 'false'} data-icon="cinematic" viewBox="0 0 24 24">
      <path
        clipRule="evenodd"
        d={`M3.8 5.4h16.4v9.8H3.8V5.4Z ${windowPath}`}
        fillRule="evenodd"
      />
      <path d="M8 17h8l1.4 2.5H6.6L8 17Z" />
    </svg>
  );
}

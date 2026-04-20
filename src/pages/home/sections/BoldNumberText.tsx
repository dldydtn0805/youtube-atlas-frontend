type BoldNumberTextProps = {
  children: string;
};

const numberPattern = /(\d[\d,]*(?:\.\d+)?(?:%|P|위|점|계단)?)/g;
const exactNumberPattern = /^\d[\d,]*(?:\.\d+)?(?:%|P|위|점|계단)?$/;

export default function BoldNumberText({ children }: BoldNumberTextProps) {
  return children.split(numberPattern).map((part, index) =>
    exactNumberPattern.test(part) ? (
      <strong key={`${part}-${index}`}>{part}</strong>
    ) : (
      part
    ),
  );
}

// QikWins wordmark: "Qik" in the text colour, "Wins" in brand blue, the
// same treatment as QikDrive's logo so the two read as one family.
const SIZES = {
  sm: "text-xl",
  md: "text-[28px]",
};

function Logo({ size = "md", className = "" }) {
  return (
    <span
      role="img"
      aria-label="QikWins"
      className={`font-logo font-extrabold tracking-[-0.035em] leading-none select-none ${SIZES[size]} ${className}`}
    >
      <span className="text-fg">Qik</span>
      <span className="text-brand">Wins</span>
    </span>
  );
}

export default Logo;

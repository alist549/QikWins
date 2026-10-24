// QikWins wordmark: "Qik" in the text colour and "Wins" in polished gold,
// set in Cinzel like a casino sign.
const SIZES = {
  sm: "text-xl",
  md: "text-[28px]",
};

function Logo({ size = "md", className = "" }) {
  return (
    <span
      role="img"
      aria-label="QikWins"
      className={`font-logo font-black tracking-[0.02em] leading-none select-none ${SIZES[size]} ${className}`}
    >
      <span className="text-fg">Qik</span>
      <span className="qw-gold-text">Wins</span>
    </span>
  );
}

export default Logo;

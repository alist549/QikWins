import { Link } from "react-router-dom";
import Spinner from "./Spinner";

// Full-width pill button. variant: primary (solid), secondary (outline),
// brand (QikDrive blue), ghost (text only) or danger (outline in red).
const VARIANTS = {
  primary: "bg-primary text-on-primary hover:opacity-90",
  brand: "qw-gold-btn font-bold hover:brightness-110",
  secondary: "border border-fg/30 bg-bg text-fg hover:bg-surface",
  ghost: "text-fg hover:bg-surface",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
};

function Button({
  path,
  title,
  icon,
  type,
  classes = "",
  fun,
  loading,
  loadingMessage,
  disabled,
  variant = "primary",
}) {
  const base = `w-full h-[52px] px-5 rounded-full flex justify-center items-center gap-2 text-[15px] font-semibold transition select-none ${VARIANTS[variant]} ${classes}`;
  if (type == "link") {
    return (
      <Link to={path} className={base}>
        {icon}
        {title}
      </Link>
    );
  }
  return (
    <button
      type={type || "button"}
      className={`${base} disabled:opacity-40 disabled:cursor-not-allowed`}
      onClick={fun}
      disabled={loading || disabled}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner className="w-4 h-4" />
          {loadingMessage}
        </span>
      ) : (
        <>
          {icon}
          {title}
        </>
      )}
    </button>
  );
}

export default Button;

function Spinner({ className = "w-5 h-5" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`}
    />
  );
}
export default Spinner;

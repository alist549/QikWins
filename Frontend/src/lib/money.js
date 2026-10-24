// All amounts arrive in cents. Demo mode plays in US dollars.
export const money = (cents, { sign = false } = {}) => {
  if (cents == null) return "";
  const value = `$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (cents < 0) return `-${value}`;
  return sign && cents > 0 ? `+${value}` : value;
};

export const percent = (rate) => `${Math.round(rate * 100)}%`;

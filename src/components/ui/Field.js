export default function Field({ label, htmlFor, required, error, aside, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-warm-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        {aside}
      </div>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
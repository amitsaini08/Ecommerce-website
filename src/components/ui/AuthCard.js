export default function AuthCard({ title, subtitle, footer, children }) {
  return (
    <div className="w-full rounded-xl border border-warm-200 border-t-2 border-t-brand-500 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-warm-900">{title}</h1>
      <p className="mb-6 mt-1 text-sm text-warm-500">{subtitle}</p>

      {children}

      {footer && (
        <div className="mt-6 border-t border-warm-100 pt-4 text-center text-sm text-warm-500">
          {footer}
        </div>
      )}
    </div>
  );
}
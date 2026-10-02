import Logo from '@/components/common/Logo';

export const metadata = {
  title: 'NovaHub — Account',
  description: 'Sign in or create your NovaHub account',
};

export default function AuthLayout({ children }) {
  const year = new Date().getFullYear();

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-white text-warm-900 antialiased">
      {/* Brand panel (sm+) */}
      <div className="relative hidden w-2/5 flex-col justify-between bg-warm-900 p-10 text-warm-50 sm:flex lg:w-1/3">
        <div
          className="pointer-events-none absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />
        <Logo tone="dark" className="relative" />
        <div className="relative">
          <p className="max-w-xs text-3xl font-semibold leading-snug">
            Curated goods, delivered with care.
          </p>
          <p className="mt-3 text-xs text-warm-400">&copy; {year} NovaHub. All rights reserved.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 p-4 text-center sm:hidden">
          <Logo />
        </header>

        {/* m-auto wrapper: chhoti screen par content upar se clip nahi hota */}
        <main className="flex min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="m-auto w-full max-w-md">{children}</div>
        </main>

        <footer className="shrink-0 p-4 text-center sm:hidden">
          <p className="text-xs text-warm-400">&copy; {year} NovaHub. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
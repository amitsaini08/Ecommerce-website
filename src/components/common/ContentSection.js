export default function ContentSection({ id, title, aside, children }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-warm-200 pt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-warm-900">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
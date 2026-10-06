export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando">
      <div className="skeleton mb-2 h-8 w-56" />
      <div className="skeleton mb-8 h-4 w-80" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}

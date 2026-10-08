export default function DataState({ loading, error, empty, retry }) {
  if (loading) return <div className="data-state" role="status">Memuat data…</div>;
  if (error) return <div className="data-state error" role="alert">{error} {retry && <button className="secondary" onClick={retry}>Coba kembali</button>}</div>;
  if (empty) return <div className="data-state">Belum ada data.</div>;
  return null;
}

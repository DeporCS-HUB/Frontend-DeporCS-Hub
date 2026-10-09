import Editor from './Editor';
import DataState from './DataState';
export function CollectionFeedback({ collection }) {
  return <><DataState loading={collection.loading} error={collection.error} empty={!collection.rows.length} retry={collection.reload} />{collection.mutationError && <p className="error" role="alert">{collection.mutationError}</p>}</>;
}
export function CollectionEditor({ resource, collection }) {
  return collection.editor && <Editor resource={resource} item={collection.editor} onClose={() => collection.setEditor(null)} onSaved={collection.saved} />;
}
export function Pagination({ collection }) {
  return <div className="pagination"><button className="secondary" disabled={!collection.page || collection.loading} onClick={() => collection.setPage(page => page - 1)}>Sebelumnya</button><span>Halaman {collection.page + 1} · hingga 100 data/halaman</span><button className="secondary" disabled={collection.rows.length < 100 || collection.loading} onClick={() => collection.setPage(page => page + 1)}>Berikutnya</button></div>;
}
export function RowActions({ collection, item }) {
  return collection.canEdit(item) && <div className="actions"><button className="secondary" disabled={collection.busy} onClick={() => collection.setEditor(item)}>Edit</button><button className="danger" disabled={collection.busy} onClick={() => collection.remove(item)}>Hapus</button></div>;
}

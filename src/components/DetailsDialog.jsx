import { useEffect, useId, useRef } from 'react';
import { date, money } from '../lib/hooks';
import { programStatusLabel } from '../lib/programs';
export default function DetailsDialog({ item, program = false, onClose }) {
 const dialog = useRef(null); const titleId = useId();
 useEffect(() => { const previous=document.activeElement; dialog.current?.focus(); return () => previous?.focus(); }, []);
 return <div className="modal-backdrop"><section className="card detail-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={dialog} tabIndex={-1} onKeyDown={e => {
  if(e.key === 'Escape')onClose();
  if(e.key === 'Tab'){const controls=[...dialog.current.querySelectorAll('button,a[href],[tabindex="0"]')];const first=controls[0],last=controls.at(-1);if(e.shiftKey && (document.activeElement===first || document.activeElement===dialog.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey && (document.activeElement===last || document.activeElement===dialog.current)){e.preventDefault();first?.focus();}}
 }}><div className="detail-header"><h2 id={titleId}>{item.name || item.title}</h2><button className="secondary" onClick={onClose}>Tutup</button></div><div className="detail-body" role="region" aria-label="Isi detail" tabIndex={0}>
 {program && <dl><div><dt>PJ</dt><dd>{item.pic}</dd></div><div><dt>Status</dt><dd>{programStatusLabel(item.status)}{item.progress != null && ` · ${item.progress}%`}</dd></div>{item.next_milestone && <div><dt>Agenda</dt><dd>{item.next_milestone}{item.milestone_date && ` · ${date(item.milestone_date)}`}</dd></div>}{item.budget != null && <div><dt>Anggaran</dt><dd>{money(item.budget)}</dd></div>}{(item.start_date || item.end_date) && <div><dt>Periode</dt><dd>{date(item.start_date)}–{date(item.end_date)}</dd></div>}</dl>}
 {item.description && <><h3>Deskripsi</h3><p>{item.description}</p></>}{program && item.progress_notes && <><h3>Catatan progres</h3><p>{item.progress_notes}</p></>}
 </div></section></div>;
}

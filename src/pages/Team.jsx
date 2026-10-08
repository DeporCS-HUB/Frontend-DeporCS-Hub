import { PageTitle, Card, Badge } from '../components/UI';
import DataState from '../components/DataState';
import { useResource } from '../lib/hooks';
import { useState } from 'react';
export default function Team() {
  const [page, setPage] = useState(0);
  const result = useResource(`/profiles?size=100&page=${page}`);
  return <><PageTitle title="Team Management" subtitle="Profiles from the trusted department database" /><Card><DataState loading={result.loading} error={result.error} empty={result.data?.length === 0} retry={result.reload} /><div className="member-list">{!result.loading && !result.error && result.data?.map(member => <div key={member.id}><span className="avatar">{member.name.slice(0,2).toUpperCase()}</span><p><b>{member.name}</b></p><Badge>{member.role}</Badge></div>)}</div><div className="pagination"><button disabled={!page || result.loading} onClick={() => setPage(value => value - 1)}>Sebelumnya</button><span>Halaman {page + 1}</span><button disabled={result.loading || result.data?.length !== 100} onClick={() => setPage(value => value + 1)}>Berikutnya</button></div><p>Undangan akun, perubahan role, struktur organisasi, dan absensi belum tersedia di UI.</p></Card></>;
}

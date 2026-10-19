import { useState } from 'react';
import { useResource } from '../lib/hooks';
const initials = name => name.split(/\s+/).slice(0,2).map(part => part[0] || '').join('').toUpperCase();
export default function Avatar({ user, large = false }) {
 return user.avatar_path ? <PrivateAvatar key={user.avatar_path} user={user} large={large} /> : <span className={`avatar ${large ? 'avatar-large' : ''}`} aria-label="Inisial profil">{initials(user.name)}</span>;
}
function PrivateAvatar({ user, large }) {
 const source = useResource(`/profiles/me/avatar?version=${encodeURIComponent(user.avatar_path)}`); const [failed,setFailed] = useState('');
 return <span className={`avatar ${large ? 'avatar-large' : ''}`} title={source.error || (failed ? 'Foto belum dapat dimuat' : user.name)}>{source.data?.url && failed !== source.data.url ? <img src={source.data.url} alt="Foto profil" referrerPolicy="no-referrer" onError={() => setFailed(source.data.url)} /> : initials(user.name)}</span>;
}

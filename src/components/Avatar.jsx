import { useState } from 'react';
import { useResource } from '../lib/hooks';
const initials = name => (name || '?').split(/\s+/).slice(0,2).map(part => part[0] || '').join('').toUpperCase();
export default function Avatar({ user, large = false, mini = false, url, alt = 'Foto profil' }) {
 if (url !== undefined) return <AvatarImage name={user.name} url={url} large={large} mini={mini} alt={alt} />;
 return user.avatar_path ? <PrivateAvatar key={user.avatar_path} user={user} large={large} /> : <AvatarImage name={user.name} large={large} />;
}
function AvatarImage({ name, url, large, mini, alt = 'Foto profil', error }) {
 const [failed, setFailed] = useState('');
 return <span className={`avatar ${large ? 'avatar-large' : ''} ${mini ? 'avatar-mini' : ''}`} title={error || name} aria-label={url && failed !== url ? undefined : `Inisial ${name}`}>
  {url && failed !== url ? <img src={url} alt={alt} referrerPolicy="no-referrer" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(url)} /> : initials(name)}
 </span>;
}
function PrivateAvatar({ user, large }) {
 const source = useResource(`/profiles/me/avatar?version=${encodeURIComponent(user.avatar_path)}`);
 return <AvatarImage name={user.name} url={source.data?.url} large={large} error={source.error} />;
}

import { useContext } from 'react';
import Avatar from './Avatar';
import { AvatarContext } from '../lib/avatar-context';
import { accountLabel } from '../lib/tasks';
export default function AccountIdentity({ profiles = [], id, name, photoOnly = false }) {
 const photos = useContext(AvatarContext);
 const profile = profiles.find(p => p.id === id);
 const label = name || accountLabel(profiles, id);
 const photo = profile?.avatar_path && photos[id]?.path === profile.avatar_path ? photos[id].url : null;
 const avatar = <Avatar user={{ name: id ? label : '—' }} url={photo} mini alt={`Foto profil ${label}`} />;
 return photoOnly ? avatar : <span className="account-chip" title={label}>{avatar}<span>{label}</span></span>;
}

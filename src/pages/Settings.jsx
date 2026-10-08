import { PageTitle, Card } from '../components/UI';
import { useAuth } from '../lib/hooks';
export default function Settings() {
  const { user } = useAuth();
  return <><PageTitle title="Settings" subtitle="Account and workspace preferences" /><Card className="settings"><h3>Account</h3><p>{user.name} · {user.role}</p><p>Preferensi bahasa, tampilan, dan notifikasi belum disimpan oleh aplikasi.</p></Card></>;
}

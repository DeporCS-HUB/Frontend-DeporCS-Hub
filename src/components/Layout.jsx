import { useAuth } from '../lib/hooks';
import { logout } from '../lib/api';
import { roleLabel } from '../lib/roles';
import { Suspense, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ClipboardList, FolderKanban, LayoutDashboard, Menu, Package, Settings, Users, WalletCards } from 'lucide-react';

import DataState from './DataState';

const navigationItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/programs', label: 'Program', icon: FolderKanban },
  { to: '/tasks', label: 'Tugas', icon: ClipboardList },
  { to: '/finance', label: 'Keuangan', icon: WalletCards },
  { to: '/inventory', label: 'Inventaris', icon: Package },
  { to: '/events', label: 'Kegiatan', icon: CalendarDays },
  { to: '/team', label: 'Tim', icon: Users },
];

export default function Layout(){
 const { user } = useAuth();
 const [logoutBusy, setLogoutBusy] = useState(false);
 async function signOut(){ setLogoutBusy(true); try { await logout(); } catch { /* Error remains visible on the login screen. */ } finally { setLogoutBusy(false); } }
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
 const closeMobileMenu = () => setIsMobileMenuOpen(false);
 const sidebarClassName = ['sidebar', isMobileMenuOpen && 'open', isSidebarCollapsed && 'collapsed'].filter(Boolean).join(' ');
 return <div className="app-shell"><a className="skip-link" href="#page-content">Lewati navigasi</a>
  <aside id="main-navigation" className={sidebarClassName}>
   <div className="brand"><span className="brand-mark" aria-hidden="true">D</span><div><b>DEPOR</b><small>BEM FASILKOM UI</small></div></div>
   <nav aria-label="Menu utama">{navigationItems.map(({to,label,icon: Icon})=><NavLink key={to} to={to} end={to === '/'} aria-label={label} title={label} onClick={closeMobileMenu}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
   <div className="sidebar-bottom"><NavLink to="/settings" aria-label="Pengaturan" title="Pengaturan" onClick={closeMobileMenu}><Settings size={19}/><span>Pengaturan</span></NavLink><button className="collapse-btn" type="button" onClick={()=>setIsSidebarCollapsed((isCollapsed)=>!isCollapsed)} aria-label={isSidebarCollapsed ? "Perluas navigasi" : "Ringkas navigasi"} aria-expanded={!isSidebarCollapsed}><ChevronLeft size={18}/></button></div>
  </aside>
  {isMobileMenuOpen&&<button className="scrim" type="button" onClick={closeMobileMenu} aria-label="Tutup navigasi"/>}
  <main className="main">
   <header className="topbar"><button className="icon-btn mobile-menu" type="button" aria-label="Buka navigasi" aria-controls="main-navigation" aria-expanded={isMobileMenuOpen} onClick={()=>setIsMobileMenuOpen(true)}><Menu/></button><div className="workspace-label">DEPOR <span>CS HUB</span></div><div className="top-actions"><button className="secondary" onClick={signOut} disabled={logoutBusy}>{logoutBusy ? "Keluar…" : "Logout"}</button><div className="avatar">{user.name.slice(0,2).toUpperCase()}</div><div className="profile"><b>{user.name}</b><small>{roleLabel(user)}</small></div></div></header>
   <div className="page" id="page-content" tabIndex={-1}><Suspense fallback={<DataState loading />}><Outlet/></Suspense></div>
  </main>
 </div>
}


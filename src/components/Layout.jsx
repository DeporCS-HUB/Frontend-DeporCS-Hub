import { useAuth } from '../lib/hooks';
import { logout } from '../lib/api';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ClipboardList, FolderKanban, LayoutDashboard, Menu, Package, Settings, Trophy, Users, WalletCards } from 'lucide-react';

const navigationItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/programs', label: 'Program', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/finance', label: 'Finance', icon: WalletCards },
  { to: '/inventory', label: 'Inventory', icon: Package },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/team', label: 'Team', icon: Users },
];

export default function Layout(){
 const { user } = useAuth();
 const [logoutBusy, setLogoutBusy] = useState(false);
 async function signOut(){ setLogoutBusy(true); try { await logout(); } catch { /* Error remains visible on the login screen. */ } finally { setLogoutBusy(false); } }
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
 const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
 const closeMobileMenu = () => setIsMobileMenuOpen(false);
 const sidebarClassName = ['sidebar', isMobileMenuOpen && 'open', isSidebarCollapsed && 'collapsed'].filter(Boolean).join(' ');
 return <div className="app-shell">
  <aside className={sidebarClassName}>
   <div className="brand"><span className="brand-mark"><Trophy size={22}/></span><div><b>DEPARTEMEN</b><small>OLAHRAGA HUB</small></div></div>
   <nav>{navigationItems.map(({to,label,icon: Icon})=><NavLink key={to} to={to} end={to === '/'} onClick={closeMobileMenu}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
   <div className="sidebar-bottom"><NavLink to="/settings" onClick={closeMobileMenu}><Settings size={19}/><span>Settings</span></NavLink><button className="collapse-btn" type="button" onClick={()=>setIsSidebarCollapsed((isCollapsed)=>!isCollapsed)} title="Collapse sidebar"><ChevronLeft size={18}/></button></div>
  </aside>
  {isMobileMenuOpen&&<button className="scrim" type="button" onClick={closeMobileMenu} aria-label="Close navigation"/>}
  <main className="main">
   <header className="topbar"><button className="icon-btn mobile-menu" type="button" onClick={()=>setIsMobileMenuOpen(true)}><Menu/></button><div className="workspace-label">Depor CS HUB</div><div className="top-actions"><button className="secondary" onClick={signOut} disabled={logoutBusy}>{logoutBusy ? "Keluar…" : "Logout"}</button><div className="avatar">{user.name.slice(0,2).toUpperCase()}</div><div className="profile"><b>{user.name}</b><small>{user.role}</small></div></div></header>
   <div className="page"><Outlet/></div>
  </main>
 </div>
}


import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Finance from './pages/Finance';
import Inventory from './pages/Inventory';
import Programs from './pages/Programs';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Team from './pages/Team';
import Login from './pages/Login';
import DataState from './components/DataState';
import { bootstrapSession } from './lib/api';
import { useAuth } from './lib/hooks';
function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <DataState loading />;
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
export default function App() {
  useEffect(() => { bootstrapSession(); }, []);
  return <Routes><Route path="/login" element={<Login />} /><Route element={<Protected />}><Route path="/" element={<Layout />}><Route index element={<Dashboard />} /><Route path="programs" element={<Programs />} /><Route path="tasks" element={<Tasks />} /><Route path="finance" element={<Finance />} /><Route path="inventory" element={<Inventory />} /><Route path="events" element={<Events />} /><Route path="team" element={<Team />} /><Route path="settings" element={<Settings />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Route></Routes>;
}

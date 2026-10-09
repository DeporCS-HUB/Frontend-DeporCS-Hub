import { lazy, useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Events = lazy(() => import('./pages/Events'));
const Finance = lazy(() => import('./pages/Finance'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Programs = lazy(() => import('./pages/Programs'));
const Settings = lazy(() => import('./pages/Settings'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Team = lazy(() => import('./pages/Team'));
import Login from './pages/Login';
import { bootstrapSession } from './lib/api';
import { useAuth } from './lib/hooks';
function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Login from={location.pathname} />;
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
export default function App() {
  useEffect(() => { bootstrapSession(); }, []);
  return <Routes><Route path="/login" element={<Login />} /><Route element={<Protected />}><Route path="/" element={<Layout />}><Route index element={<Dashboard />} /><Route path="programs" element={<Programs />} /><Route path="tasks" element={<Tasks />} /><Route path="finance" element={<Finance />} /><Route path="inventory" element={<Inventory />} /><Route path="events" element={<Events />} /><Route path="team" element={<Team />} /><Route path="settings" element={<Settings />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Route></Routes>;
}

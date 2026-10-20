import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import routeLoaders, { loadLayout, loadProgramDetail } from './lib/routes';
import DataState from './components/DataState';
const Layout = lazy(loadLayout);
const Dashboard = lazy(routeLoaders['/']);
const Events = lazy(routeLoaders['/events']);
const Finance = lazy(routeLoaders['/finance']);
const Inventory = lazy(routeLoaders['/inventory']);
const Programs = lazy(routeLoaders['/programs']);
const ProgramDetail = lazy(loadProgramDetail);
const Settings = lazy(routeLoaders['/settings']);
const Tasks = lazy(routeLoaders['/tasks']);
const Team = lazy(routeLoaders['/team']);
import Login from './pages/Login';
import { useAuth } from './lib/hooks';
function Protected() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Login from={location.pathname} />;
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location.pathname }} replace />;
}
export default function App() {
  return <Suspense fallback={<DataState loading />}><Routes><Route path="/login" element={<Login />} /><Route element={<Protected />}><Route path="/" element={<Layout />}><Route index element={<Dashboard />} /><Route path="programs" element={<Programs />} /><Route path="programs/:id" element={<ProgramDetail />} /><Route path="tasks" element={<Tasks />} /><Route path="finance" element={<Finance />} /><Route path="inventory" element={<Inventory />} /><Route path="events" element={<Events />} /><Route path="team" element={<Team />} /><Route path="settings" element={<Settings />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Route></Routes></Suspense>;
}

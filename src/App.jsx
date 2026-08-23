import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Finance from './pages/Finance';
import Inventory from './pages/Inventory';
import Programs from './pages/Programs';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Team from './pages/Team';

const routes = [
  { path: 'programs', element: <Programs /> },
  { path: 'tasks', element: <Tasks /> },
  { path: 'finance', element: <Finance /> },
  { path: 'inventory', element: <Inventory /> },
  { path: 'events', element: <Events /> },
  { path: 'team', element: <Team /> },
  { path: 'settings', element: <Settings /> },
];

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        {routes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}

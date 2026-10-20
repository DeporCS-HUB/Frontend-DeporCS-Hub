const loaders = {
 '/': () => import('../pages/Dashboard'),
 '/programs': () => import('../pages/Programs'),
 '/tasks': () => import('../pages/Tasks'),
 '/finance': () => import('../pages/Finance'),
 '/inventory': () => import('../pages/Inventory'),
 '/events': () => import('../pages/Events'),
 '/team': () => import('../pages/Team'),
 '/settings': () => import('../pages/Settings'),
};
export const loadLayout = () => import('../components/Layout');
export const loadProgramDetail = () => import('../pages/ProgramDetail');
export function routeLoader(path) { return /^\/programs\/[^/]+$/.test(path) ? loadProgramDetail : loaders[path]; }
export function preloadRoute(path) {
 const connection = navigator.connection;
 if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;
 const loader = routeLoader(path);
 if (loader) { void loadLayout().catch(() => {}); void loader().catch(() => {}); }
}
export default loaders;

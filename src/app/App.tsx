import { lazy, Suspense, useEffect, useState } from 'react';

const HomePage = lazy(() => import('../pages/home/HomePage'));
const AdminPage = lazy(() => import('../pages/admin/AdminPage'));

function getCurrentPathname() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname;
}

function App() {
  const [pathname, setPathname] = useState(getCurrentPathname);

  useEffect(() => {
    const handleNavigation = () => {
      setPathname(getCurrentPathname());
    };

    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <HomePage />
    </Suspense>
  );
}

export default App;

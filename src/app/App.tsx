import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { getInitialRegionCode } from '../pages/home/utils';
import {
  getHomePath,
  getPendingHomeChartView,
  parseHomeRoute,
} from './homeRoute';

const HomePage = lazy(() => import('../pages/home/HomePage'));
const AdminPage = lazy(() => import('../pages/admin/AdminPage'));

function getDefaultHomePath() {
  return getHomePath(getInitialRegionCode(), getPendingHomeChartView());
}

function HomeRedirect() {
  return <Navigate replace to={getDefaultHomePath()} />;
}

function HomeRoute() {
  const { category, nation } = useParams();
  const homeRoute = parseHomeRoute(nation, category);

  if (!homeRoute) {
    return <HomeRedirect />;
  }

  const canonicalPath = getHomePath(
    homeRoute.regionCode,
    homeRoute.chartView,
  );

  if (`/${nation}/${category}` !== canonicalPath) {
    return <Navigate replace to={canonicalPath} />;
  }

  return (
    <HomePage
      selectedChartView={homeRoute.chartView}
      selectedRegionCode={homeRoute.regionCode}
    />
  );
}

function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/:nation/:category" element={<HomeRoute />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  );
}

export default App;

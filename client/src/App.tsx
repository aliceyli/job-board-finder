import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FeedPage from './pages/Feed';
import CompaniesPage from './pages/Companies/index';
import PreferencesPage from './pages/Preferences';
import NavBar from './components/NavBar';
import { AppRoute } from './domain/routes';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function App() {
  const routes: AppRoute[] = [
    { path: '/', label: 'Feed', element: <FeedPage /> },
    { path: '/companies', label: 'Companies', element: <CompaniesPage /> },
    { path: '/preferences', label: 'Preferences', element: <PreferencesPage /> },
  ];

  return (
    <BrowserRouter>
      <div className="container">
        <NavBar routes={routes} />
        <Routes>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

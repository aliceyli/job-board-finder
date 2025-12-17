import { Link } from 'react-router-dom';
import { AppRoute } from '../domain/routes';
import style from './NavBar.module.css';

export default function NavBar({ routes }: { routes: AppRoute[] }) {
  return (
    <nav className={style.container}>
      {routes.map((route) => {
        const { path, label } = route;
        return (
          <div key={route.path} className={style.navRow}>
            <Link to={path}>{label}</Link>
          </div>
        );
      })}
    </nav>
  );
}

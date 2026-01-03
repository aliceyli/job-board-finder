import { useState, useEffect } from 'react';
import { getCompanies, searchCompany } from '../../lib/api';
import style from './index.module.css';

// to-do: update type to match api
type Company = {
  id: number;
  name: string;
  board: string;
  board_url: string;
  created_at: string;
  updated_at: string;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);

  async function fetchCompanies() {
    const companiesData = await getCompanies();
    setCompanies(companiesData);
  }

  useEffect(() => {
    fetchCompanies();
  }, []);

  return (
    <div className="page">
      <h1>Browse Companies</h1>
      <p>to-do: add a filter here</p>
      {companies ? (
        <div className={style.CompanyResultsContainer}>
          <ul className={style.CompanyResultsList}>
            {companies.map(({ id, name, board, board_url, updated_at, job_count }) => {
              const updatedDate = new Date(updated_at).toLocaleDateString('en-US');
              return (
                <li key={id} className={style.CompanyResultsItem}>
                  <div>{name}</div>
                  <div>
                    <span>
                      <a href={board_url}>job board - </a>
                      {board}
                    </span>
                  </div>
                  <div>updated {updatedDate}</div>
                  <div>{job_count} listed jobs</div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div>No companies</div>
      )}
    </div>
  );
}

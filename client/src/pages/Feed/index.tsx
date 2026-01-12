import { useState, useEffect, useRef } from 'react';
import { getJobs } from '../../lib/api';
import { Job } from '../../types';
import DOMPurify from 'dompurify';
import styles from './index.module.css';

export default function FeedPage() {
  // TO-DO: allow jobs to be marked as interested or not interested
  // TO-DO: return only unreviewed jobs with matching preferences
  const FIRST_PAGE = 1;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [resultsCount, setResultsCount] = useState<number>(0);
  const [resultsPerPage, setResultsPerPage] = useState<number>(5);

  const [selectedJob, setSelectedJob] = useState<Job | undefined>();
  const [titleQueryInput, setTitleQueryInput] = useState('');
  const [minYearsInput, setMinYearsInput] = useState('');
  const [searchParams, setSearchParams] = useState({
    pageNum: FIRST_PAGE,
    titleQuery: titleQueryInput,
    minYears: minYearsInput,
  });
  const jobPreview = useRef<HTMLDivElement | null>(null);

  const { pageNum } = searchParams;
  const totalPageCount = resultsPerPage > 0 ? Math.ceil(resultsCount / resultsPerPage) : 0;

  useEffect(() => {
    async function onLoad() {
      const data = await getJobs(searchParams);
      const { resultsPerPage, resultsCount, results } = data;
      setResultsPerPage(resultsPerPage);
      setResultsCount(resultsCount);
      setJobs(results);
    }
    onLoad();
  }, [searchParams]);

  const handleSearchSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSearchParams({
      pageNum: FIRST_PAGE,
      titleQuery: titleQueryInput,
      minYears: minYearsInput,
    });
    setSelectedJob(undefined);
  };

  function nextPage() {
    setSearchParams((prev) => ({ ...prev, pageNum: prev.pageNum + 1 }));
  }

  function prevPage() {
    setSearchParams((prev) => ({
      ...prev,
      pageNum: prev.pageNum > FIRST_PAGE ? prev.pageNum - 1 : FIRST_PAGE,
    }));
  }

  useEffect(() => {
    if (jobPreview.current) {
      jobPreview.current.scrollTop = 0;
    }
  }, [selectedJob]);

  function isEscapedHtml(input: string): boolean {
    return input.includes('&lt;') || input.includes('&gt;') || input.includes('&quot;');
  }

  function safeDecodeHtmlEntities(input: string): string {
    let htmlString = input;

    if (isEscapedHtml(input)) {
      const doc = new DOMParser().parseFromString(input, 'text/html');
      htmlString = doc.documentElement.textContent ?? '';
    }

    return DOMPurify.sanitize(htmlString);
  }

  const safeHtmlDescription = safeDecodeHtmlEntities(selectedJob?.description || '');

  return (
    <div className="page">
      <h1>Job Feed</h1>
      <div className={styles.FilterBar}>
        <form onSubmit={handleSearchSubmit}>
          <div className={styles.SearchRow}>
            <div className={styles.SearchBar}>
              <i className={`bi bi-search ${styles.Icon}`}></i>
              <input
                className={styles.SearchInput}
                type="text"
                placeholder="Job Title"
                value={titleQueryInput}
                onChange={(e) => setTitleQueryInput(e.target.value)}
              />
              <button className={styles.SearchButton} type="submit">
                Search
              </button>
            </div>
            <input
              className={styles.FilterInput}
              type="number"
              placeholder="Years Experience"
              min={0}
              step={1}
              value={minYearsInput}
              onChange={(e) => setMinYearsInput(e.target.value)}
              aria-label="Years Experience Filter"
            />
          </div>
        </form>
      </div>
      <div className={styles.JobFeedContainer}>
        <div className={styles.JobColumn}>
          <div className={styles.PaginationBar}>
            <div>{resultsCount} results</div>
            <div className={styles.Pagination}>
              {pageNum > FIRST_PAGE && (
                <button onClick={prevPage}>
                  <i className="bi bi-chevron-left"></i>
                </button>
              )}
              <div>
                page {pageNum} of {totalPageCount}
              </div>
              {pageNum < totalPageCount && (
                <button onClick={nextPage}>
                  <i className="bi bi-chevron-right"></i>
                </button>
              )}
            </div>
          </div>
          <ul className={styles.JobList}>
            {jobs.length > 0
              ? jobs.map((job) => (
                  <li
                    className={`${styles.JobCard} ${job === selectedJob ? styles.JobCardSelected : ''} `}
                    key={job.id}
                    onClick={(e) => {
                      setSelectedJob(job);
                    }}
                  >
                    <div className={styles.JobTitle}>{job.title}</div>
                    <div>Company: {job.company_name}</div>
                    <div>Location: {job.location}</div>
                    <a href={job.url} className={styles.JobLink}>
                      View role
                    </a>
                  </li>
                ))
              : 'No new jobs to review'}
          </ul>
        </div>
        {selectedJob && (
          <div className={styles.JobColumn} ref={jobPreview}>
            <div className={styles.CloseButton}>
              <button onClick={() => setSelectedJob(undefined)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            {safeHtmlDescription ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: safeHtmlDescription,
                }}
              />
            ) : (
              <div>No description available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

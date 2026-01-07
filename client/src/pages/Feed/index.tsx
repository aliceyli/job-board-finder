import { useState, useEffect, useRef } from 'react';
import { getJobs } from '../../lib/api';
import { Job } from '../../types';
import DOMPurify from 'dompurify';
import styles from './index.module.css';

export default function FeedPage() {
  // TO-DO: allow jobs to be marked as interested or not interested
  // TO-DO: return only unreviewed jobs with matching preferences

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | undefined>();
  const jobPreview = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function onLoad() {
      const jobsData: Job[] = await getJobs();
      setJobs(jobsData);
    }
    onLoad();
  }, []);

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
      <div className={styles.JobFeedContainer}>
        <div className={styles.JobColumn}>
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

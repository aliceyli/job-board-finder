import { useState, useEffect } from 'react';
import { getJobs } from '../../lib/api';
import { Job } from '../../types';
import styles from './index.module.css';

export default function FeedPage() {
  // TO-DO: allow jobs to be marked as interested or not interested
  // TO-DO: return only unreviewed jobs with matching preferences

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | undefined>();

  useEffect(() => {
    async function onLoad() {
      const jobsData: Job[] = await getJobs();
      setJobs(jobsData);
    }
    onLoad();
  }, []);

  return (
    <div className="page">
      <h1>Job Feed</h1>
      <div className={styles.JobFeedContainer}>
        <div className={styles.JobList}>
          <ul>
            {jobs.length > 0
              ? jobs.map((job) => (
                  <li
                    key={job.id}
                    onClick={(e) => {
                      setSelectedJob(job);
                    }}
                  >
                    <div className="JobCard">
                      <h3>{job.title}</h3>
                      <div>Company: {job.company_name}</div>
                      <div>Location: {job.location}</div>
                      <a href={job.url}>View role</a>
                    </div>
                  </li>
                ))
              : 'No new jobs to review'}
          </ul>
        </div>
        {selectedJob && (
          <div className={styles.JobPreview}>
            {selectedJob.description ? (
              /* TO-DO: consider adding DOMPurify - https://stackoverflow.com/questions/29044518/safe-alternative-to-dangerouslysetinnerhtml*/
              <div dangerouslySetInnerHTML={{ __html: selectedJob.description }} />
            ) : (
              <div>No description available</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

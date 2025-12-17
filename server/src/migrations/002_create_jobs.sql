CREATE TABLE IF NOT EXISTS jobs (
    id SERIAL PRIMARY KEY,
    title TEXT, 
    company_id INT REFERENCES companies(id),
    location TEXT, 
    url TEXT UNIQUE,
    team TEXT, 
    employment_type TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
)
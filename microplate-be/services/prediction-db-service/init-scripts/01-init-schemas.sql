-- Create schemas for prediction-db-service
CREATE SCHEMA IF NOT EXISTS prediction_result;
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA prediction_result TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

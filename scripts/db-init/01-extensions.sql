-- Applied once when the local Postgres container is first created.
-- Production databases get these from the first migration (requires a role with CREATE EXTENSION).
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE DATABASE gh_test;
\connect gh_test
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

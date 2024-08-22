CREATE TABLE users (
    id INTEGER NOT NULL, 
    email TEXT NOT NULL, 
    hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT, 
    PRIMARY KEY(id));

CREATE UNIQUE INDEX email ON users (email);
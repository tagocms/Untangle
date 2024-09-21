CREATE TABLE lists (
    id INTEGER NOT NULL,
    list_icon TEXT,  
    list_name TEXT NOT NULL, 
    user_id INTEGER NOT NULL,
    PRIMARY KEY(id),
    FOREIGN KEY(user_id) REFERENCES users(id));


CREATE INDEX lists_id ON lists(id);
CREATE INDEX lists_user_id ON lists(user_id);
CREATE INDEX lists_list_name ON lists(list_name);
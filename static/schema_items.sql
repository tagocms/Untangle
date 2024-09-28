CREATE TABLE items (
    id INTEGER NOT NULL, 
    title TEXT NOT NULL, 
    body TEXT,
    item_type TEXT NOT NULL,
    item_priority INTEGER,
    deadline DATETIME DEFAULT NULL,
    list_id INTEGER NOT NULL,
    item_status BOOLEAN NOT NULL,
    user_id INTEGER NOT NULL,
    Timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
    FOREIGN KEY(list_id) REFERENCES lists(id));

CREATE TABLE tags (
    item_id INTEGER NOT NULL, 
    tag TEXT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES items(id));

CREATE INDEX items_id ON items(id);
CREATE INDEX items_list_id ON items(list_id);
CREATE INDEX tags_item_id ON tags(item_id);
CREATE INDEX tags_tag ON tags(tag);
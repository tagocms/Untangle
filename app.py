from flask import Flask, redirect, render_template, request, session, jsonify
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import create_engine, text
from functools import wraps
from email_validator import validate_email, EmailNotValidError
from string import ascii_letters, digits
from flask_wtf.csrf import CSRFProtect
import secrets

app = Flask(__name__)
db = create_engine("sqlite+pysqlite:///untangle.db", echo=True)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

app.config['SECRET_KEY'] = secrets.token_urlsafe(16)
csrf = CSRFProtect(app)

@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response

def login_required(f):

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("user_id") is None:
            return redirect("/login")
        return f(*args, **kwargs)

    return decorated_function

def validate_password(text):
    count = 0
    upper = 0
    lower = 0
    number = 0
    special = 0
    for letter in text:
        count += 1
        if letter.isnumeric():
            number += 1
        elif letter.isupper():
            upper += 1
        elif letter.islower():
            lower += 1
        elif not letter.isalnum() and not letter.isspace():
            special += 1
    if (count >= 8 and upper > 0 and lower > 0 and number > 0 and special > 0):
        return True
    else:
        return False

@app.route("/")
def index():
    if session.get("user_id"):
        return redirect("/webapp")
    else:
        session.clear()
    return render_template("index.html")

@app.route("/webapp")
@login_required
def webapp():
    user_id = session.get("user_id")
    emojis = ["📋", "💻", "💼", "💽", "💾", "📁", "📅", "📌", "📓", "📢", "🔋", "📰", "🚀", "🚗", "⛔", "🚴", "🛐", "🎁", "🎀", "🎓", "💰", "🔎", "💥", "💡", "😀", "😂", "😍", "😎", "😭"]

    with db.begin() as conn:
        result = conn.execute(text("SELECT * FROM items WHERE user_id = :user_id ORDER BY item_type DESC, datetime(Timestamp) DESC"), {"user_id": user_id})
        rows = result.mappings().all()
    items = [dict(row) for row in rows]

    with db.begin() as conn:
        placeholders = ",".join([":item_id" + str(i) for i in range(len(items))])
        query = f"SELECT * FROM tags WHERE item_id IN ({placeholders})"
        params = {f"item_id{i}": item['id'] for i, item in enumerate(items)}
        result = conn.execute(text(query), params)
        rows = result.mappings().all()
    tags = [dict(row) for row in rows]

    with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM lists WHERE user_id = :user_id"), {"user_id": user_id})
            rows = result.mappings().all()
    lists = [dict(row) for row in rows]

    inbox_id = 0

    if lists:
        for list in lists:
            if list["list_name"] == "Inbox":
                inbox_id = list["id"]

    
    return render_template("webapp.html", items=items, tags=tags, lists=lists, emojis=emojis, inbox_id=inbox_id)

@app.route("/create", methods=["POST", "GET"])
@login_required
def create():
    if request.method == "POST":
        title = request.form.get("create_item")

        if not title or len(title) > 200:
            return redirect("/webapp")
        
        item_type = "task"
        item_status = 0
        item_priority = 0
        user_id = session.get("user_id")
        list_name = "Inbox"
        list_id = 0

        with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM lists WHERE user_id = :user_id AND list_name = :list_name"), {"user_id": user_id, "list_name": list_name})
        
        rows = result.mappings().all()
        
        if rows:
            for row in rows:
                if row["list_name"] == list_name and row["user_id"] == user_id:
                    list_id = row["id"]
        elif not rows:
            with db.begin() as conn:
                conn.execute(text("INSERT INTO lists (list_icon, list_name, user_id) VALUES (:list_icon, :list_name, :user_id)"), 
                             {"list_icon": "📥", "list_name": "Inbox", "user_id": user_id})
            with db.begin() as conn:
                result_new = conn.execute(text("SELECT * FROM lists WHERE user_id = :user_id AND list_name = :list_name"), {"user_id": user_id, "list_name": list_name})
            
            rows_new = result_new.mappings().all()

            for row_new in rows_new:
                if row_new["list_name"] == list_name and row_new["user_id"] == user_id:
                    list_id = row_new["id"]

        with db.begin() as conn:
            conn.execute(text("INSERT INTO items (title, item_type, list_id, item_status, user_id, item_priority) VALUES (:title, :item_type, :list_id, :item_status, :user_id, :item_priority)"), 
                         {"title": title, "item_type": item_type, "list_id": list_id,"item_status": item_status ,"user_id": user_id, "item_priority": item_priority})
        
        return redirect("/webapp")
    else:
        return redirect("/webapp")


@app.route("/delete", methods=["POST", "GET"])
@login_required
def delete():
    if request.method == "POST":
        data = request.get_json()
        id = data["item_id"]

        with db.begin() as conn:
            conn.execute(text("DELETE FROM items WHERE id = :id"), {"id": id})

        with db.begin() as conn:
            conn.execute(text("DELETE FROM tags WHERE item_id = :id"), {"id": id})

        return jsonify({"response": "Update successful", "type": 200})
    else:
        return jsonify({"response": "No update", "type": 200})


@app.route("/update", methods=["POST", "GET"])
@login_required
def update():
    if request.method == "POST":
        data = request.get_json()
        print("Received data:", data) 
        id = data["item_id"]
        body = data["body_value"]
        title = data["title_value"]
        deadline = data["deadline_value"]
        priority = data["priority_value"]
        tags = data["tags_list"]
        list_id = data["list_id"]
        item_type = data["type_value"]
        item_status = data["status_value"]
        user_id = session.get("user_id")

        if item_type == "note":
            item_status = False

        if not id or len(title) > 200:
            return jsonify({"response": "Invalid data", "type": 400})

        with db.begin() as conn:
            rows = conn.execute(text("SELECT * FROM items WHERE id = :id AND user_id = :user_id"), {"id": id, "user_id": user_id})
            if not rows.all():
                return jsonify({"response": "Item not found", "type": 400})

        with db.begin() as conn:
            conn.execute(
                text(
                "UPDATE items SET body = :body, title = :title, deadline = :deadline, item_priority = :priority, list_id = :list_id, item_type = :item_type, item_status = :item_status WHERE id = :id"
                ), 
                {"id": id, "body": body, "title": title, "deadline": deadline, "priority": priority, "list_id": list_id, "item_type": item_type, "item_status": item_status}
                )
        
        if tags:
            tags_adj = []
            for i in range(len(tags)):
                count = 0
                for j in range(i, len(tags)):
                    if tags[i] == tags[j]:
                        count += 1
                if count == 1 and len(tags[i]) <= 30:
                     tags_adj.append(tags[i])
        
            tags = tags_adj
        
        if tags:
            with db.begin() as conn:
                    conn.execute(text("DELETE FROM tags WHERE item_id = :item_id"), {"item_id": id})

                    placeholders = ",".join([f"(:item_id{i}, :tag{i})" for i in range(len(tags))])
                    query = f"INSERT INTO tags (item_id, tag) VALUES {placeholders}"
                    params_ids = {f"item_id{i}": id for i in  range(len(tags))}
                    params_tags = {f"tag{i}": tags[i] for i in range(len(tags))}
                    params = {**params_ids, **params_tags}
                    conn.execute(text(query), params)
        
        return jsonify({"response": "Update successful", "type": 200})
    else:
        return jsonify({"response": "No update", "type": 200})


@app.route("/read", methods=["POST", "GET"])
@login_required
def read():
    if request.method == "POST":
        data = request.get_json()
        user_id = session.get("user_id")

        with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM items WHERE user_id = :user_id ORDER BY item_type DESC, datetime(Timestamp) DESC"), {"user_id": user_id})
            rows = result.mappings().all()
        items = [dict(row) for row in rows]

        with db.begin() as conn:
            placeholders = ",".join([":item_id" + str(i) for i in range(len(items))])
            query = f"SELECT * FROM tags WHERE item_id IN ({placeholders})"
            params = {f"item_id{i}": item['id'] for i, item in enumerate(items)}
            result = conn.execute(text(query), params)
            rows = result.mappings().all()
        tags = [dict(row) for row in rows]

        with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM lists WHERE user_id = :user_id"), {"user_id": user_id})
            rows = result.mappings().all()
        lists = [dict(row) for row in rows]
        
        if data["type"] == "items":
            return jsonify(items)
        elif data["type"] == "tags":
            return jsonify(tags)
        elif data["type"] == "lists":
            return jsonify(lists)
        else:
            return jsonify({"response": "Item not found", "type": 400})
    else:
        return jsonify({"response": "No update", "type": 200})


@app.route("/filter", methods=["POST", "GET"])
@login_required
def filter():
    if request.method == "POST":
        data = request.get_json()
        title = data["title"]
        filter_type = data["filter_type"]
        list_id = data["list_id"]
        item_type = data["item_type"]
        item_status = data["item_status"]
        user_id = session.get("user_id")

        if filter_type == "search":
            with db.begin() as conn:
                result = conn.execute(text("SELECT * FROM items WHERE user_id = :user_id AND title LIKE :title ORDER BY item_type DESC, datetime(Timestamp) DESC"), {"user_id": user_id, "title": "%" + title + "%"})
                rows = result.mappings().all()
            items = [dict(row) for row in rows]
        elif filter_type == "list":
            with db.begin() as conn:
                result = conn.execute(text("SELECT * FROM items WHERE user_id = :user_id AND list_id = :list_id ORDER BY item_type DESC, datetime(Timestamp) DESC"), {"user_id": user_id, "list_id": list_id})
                rows = result.mappings().all()
            items = [dict(row) for row in rows]
        elif filter_type == "complete":
            with db.begin() as conn:
                result = conn.execute(text("SELECT * FROM items WHERE user_id = :user_id AND item_status = :item_status ORDER BY item_type DESC, datetime(Timestamp) DESC"), {"user_id": user_id, "item_status": item_status})
                rows = result.mappings().all()
            items = [dict(row) for row in rows]
        elif filter_type == "type":
            with db.begin() as conn:
                result = conn.execute(text("SELECT * FROM items WHERE user_id = :user_id AND item_type = :item_type ORDER BY item_type DESC, datetime(Timestamp) DESC"), {"user_id": user_id, "item_type": item_type})
                rows = result.mappings().all()
            items = [dict(row) for row in rows]
        else:
            return jsonify({"response": "Item not found", "type": 400})

        return jsonify(items)
    else:
        return jsonify({"response": "No update", "type": 200})


@app.route("/create-list", methods=["POST", "GET"])
@login_required
def create_list():
    if request.method == "POST":
        list_name = request.form.get("create_list").strip()
        list_icon = request.form.get("list_emoji").strip()

        if not list_name or len(list_name) > 30:
            return redirect("/webapp")

        if not list_icon:
            list_icon = "📋"
        
        user_id = session.get("user_id")

        with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM lists WHERE user_id = :user_id AND list_name = :list_name"), {"user_id": user_id, "list_name": list_name})
            rows = result.mappings().all()

        items = [dict(row) for row in rows]
        if items:
            for item in items:
                if item["list_name"] == list_name:
                    return redirect("/webapp")

        with db.begin() as conn:
            conn.execute(text("INSERT INTO lists (list_icon, list_name, user_id) VALUES (:list_icon, :list_name, :user_id)"), 
                         {"list_icon": list_icon, "list_name": list_name, "user_id": user_id})
        
        return redirect("/webapp")
    else:
        return redirect("/webapp")
    

@app.route("/update-list", methods=["POST", "GET"])
@login_required
def update_list():
    if request.method == "POST":
        try:
            id = int(request.form.get("edit_list_id").strip())
        except:
            return redirect("/webapp")
    
        list_name = request.form.get("edit_list").strip()
        list_icon = request.form.get("edit_list_emoji").strip()

        if not list_name or len(list_name) > 30:
            return redirect("/webapp")
        elif list_name == "Inbox":
            return redirect("/webapp")

        if not list_icon:
            list_icon = "📋"
        
        user_id = session.get("user_id")

        with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM lists WHERE user_id = :user_id AND list_name = :list_name"), {"user_id": user_id, "list_name": list_name})
            rows = result.mappings().all()

        items = [dict(row) for row in rows]
        if items:
            for item in items:
                if item["list_name"] == list_name and item["id"] != id:
                    print(item)
                    return redirect("/webapp")

        with db.begin() as conn:
            conn.execute(text("UPDATE lists SET list_icon = :list_icon, list_name = :list_name WHERE user_id = :user_id AND id = :id"), 
                         {"list_icon": list_icon, "list_name": list_name, "user_id": user_id, "id": id})
        
        return redirect("/webapp")
    else:
        return redirect("/webapp")


@app.route("/delete-list", methods=["POST", "GET"])
@login_required
def delete_list():
    if request.method == "POST":
        print("Delete List called")
        try:
            id = int(request.form.get("delete_list_id").strip())
        except:
            return redirect("/webapp")
        
        user_id = session.get("user_id")

        with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM lists WHERE user_id = :user_id"), {"user_id": user_id})
            rows = result.mappings().all()

        lists = [dict(row) for row in rows]
        inbox_id = 0
        if lists:
            for list in lists:
                if list["list_name"] == "Inbox" and list["id"] == id:
                    return redirect("/webapp")
                elif list["list_name"] == "Inbox" and list["id"] != id:
                    inbox_id = list["id"]

        with db.begin() as conn:
            conn.execute(text("DELETE FROM lists WHERE user_id = :user_id AND id = :id"), {"user_id": user_id, "id": id})
        
        with db.begin() as conn:
            conn.execute(text("UPDATE items SET list_id = :inbox_id WHERE list_id = :id AND user_id = :user_id"), {"inbox_id": inbox_id, "id": id, "user_id": user_id})
        
        return redirect("/webapp")
    else:
        return redirect("/webapp")


@app.route("/signup", methods=["GET", "POST"])
def signup():
    
    if session.get("user_id"):
        return redirect("/webapp")
    else:
        session.clear()
    
    if request.method == "POST":

        email = request.form.get("email")
        pass_p = request.form.get("password")
        pass_c = request.form.get("confirmation")

        if not email:
             return render_template("signup.html", error="Missing email.")
        elif not pass_p:
            return render_template("signup.html", error="Missing password.")
        elif not validate_password(pass_p):
            return render_template("signup.html", 
                                   error="Your password must at least be 8 characters long; have 1 uppercase character; 1 lowercase character; have 1 number; have 1 special character.")
        elif not pass_c or pass_p != pass_c:
            return render_template("signup.html", error="Passwords don't match.")
        
        try:
            emailinfo = validate_email(email, check_deliverability=True)
            email = emailinfo.normalized
        except EmailNotValidError:
            return render_template("signup.html", error="Invalid email.")

        try:
            hash_p = generate_password_hash(pass_p)
        except:
            return render_template("signup.html", error="Unable to hash password. Try other characters.")
        
        with db.begin() as conn:
            result = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
            rows = result.all()
            if not rows:
                conn.execute(text("INSERT INTO users (email, hash) VALUES (:email, :hash_p)"), {"email": email, "hash_p": hash_p})
                session["user_id"] = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).all()[0].id
                conn.execute(text("INSERT INTO lists (list_icon, list_name, user_id) VALUES (:list_icon, :list_name, :user_id)"), {"list_icon": "📥", "list_name": "Inbox", "user_id": session["user_id"]})
                print(session["user_id"])
            else:
                return render_template("signup.html", error="User already exists.")

        return redirect("/webapp")
    else:
        return render_template("signup.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("user_id"):
        return redirect("/webapp")
    else:
        session.clear()

    if request.method == "POST":
        email = request.form.get("email")
        pass_p = request.form.get("password")

        if not email:
            return render_template("login.html", error="Missing email.")
        elif not pass_p:
            return render_template("login.html", error="Missing password.")
        
        with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})
            rows = result.all()
            if not rows:
                return render_template("login.html", error="Invalid email and/or password.")
            elif not check_password_hash(rows[0].hash, pass_p):
                return render_template("login.html", error="Invalid email and/or password.")
        
        session["user_id"] = rows[0].id

        return redirect("/webapp")
    else:
        return render_template("login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


if __name__ == "__main__":
    app.run(debug=True)
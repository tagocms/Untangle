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
    return render_template("webapp.html", items=items, tags=tags)

@app.route("/create", methods=["POST", "GET"])
@login_required
def create():
    if request.method == "POST":
        title = request.form.get("create_item")

        if not title:
            return redirect("/webapp")
        
        item_type = "task"
        list = "inbox"
        item_status = 0
        user_id = session.get("user_id")

        with db.begin() as conn:
            conn.execute(text("INSERT INTO items (title, item_type, list, item_status, user_id) VALUES (:title, :item_type, :list, :item_status, :user_id)"), 
                         {"title": title, "item_type": item_type, "list": list,"item_status": item_status ,"user_id": user_id})
        
        return redirect("/webapp")
    else:
        return redirect("/webapp")


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
        user_id = session.get("user_id")

        if not id:
            return jsonify({"response": "Invalid data", "type": 400})

        with db.begin() as conn:
            rows = conn.execute(text("SELECT * FROM items WHERE id = :id AND user_id = :user_id"), {"id": id, "user_id": user_id})
            if not rows.all():
                return jsonify({"response": "Item not found", "type": 400})

        with db.begin() as conn:
            conn.execute(text("UPDATE items SET body = :body, title = :title, deadline = :deadline, item_priority = :priority WHERE id = :id"), 
                         {"id": id, "body": body, "title": title, "deadline": deadline, "priority": priority})
        
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
            result = conn.execute(text("SELECT * FROM items WHERE user_id = :user_id"), {"user_id": user_id})
            rows = result.mappings().all()
        items = [dict(row) for row in rows]

        with db.begin() as conn:
            placeholders = ",".join([":item_id" + str(i) for i in range(len(items))])
            query = f"SELECT * FROM tags WHERE item_id IN ({placeholders})"
            params = {f"item_id{i}": item['id'] for i, item in enumerate(items)}
            result = conn.execute(text(query), params)
            rows = result.mappings().all()
        tags = [dict(row) for row in rows]
        
        if data["type"] == "items":
            return jsonify(items)
        elif data["type"] == "tags":
            return jsonify(tags)
        else:
            return jsonify({"response": "Item not found", "type": 400})
    else:
        return jsonify({"response": "No update", "type": 200})


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
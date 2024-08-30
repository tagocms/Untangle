from flask import Flask, redirect, render_template, request, session
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy import create_engine, text
from functools import wraps

app = Flask(__name__)
db = create_engine("sqlite+pysqlite:///untangle.db", echo=True)

app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

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
    return render_template("webapp.html")

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
            return "error: missing email"
        elif not pass_p:
            return "error: missing password"
        elif not pass_c or pass_p != pass_c:
            return "error - passwords don't match"

        try:
            hash_p = generate_password_hash(pass_p)
        except:
            return "error - unable to generate hash"
        
        with db.begin() as conn:
            result = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
            rows = result.all()
            if not rows:
                conn.execute(text("INSERT INTO users (email, hash) VALUES (:email, :hash_p)"), {"email": email, "hash_p": hash_p})
                session["user_id"] = conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email}).all()[0].id
                print(session["user_id"])
            else:
                return "error - user already exists"

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
            return "error - must provide email"
        elif not pass_p:
            return "error - must provide password"
        
        with db.begin() as conn:
            result = conn.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})
            rows = result.all()
            if not rows:
                return "error - invalid email and/or password"
            elif not check_password_hash(rows[0].hash, pass_p):
                return "error - invalid email and/or password"
        
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
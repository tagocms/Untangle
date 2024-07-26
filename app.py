from flask import Flask, render_template, redirect
import flask_session

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")
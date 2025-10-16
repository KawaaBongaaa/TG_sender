from flask import Flask, send_from_directory, send_file
import os

app = Flask(__name__, static_folder='.')

@app.route('/')
def index():
    return send_file('index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    print("🚀 Starting server on http://localhost:5000")
    print("📂 Serving telegram-sender-webapp directory")
    app.run(host='0.0.0.0', port=5000, debug=True)

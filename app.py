from flask import Flask, request
from flask_socketio import SocketIO, send, emit, join_room, leave_room
from transformers import pipeline

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

toxicity_classifier = pipeline("text-classification", model="unitary/toxic-bert")

warnings = {}
banned_users = set()
connected_users = {}  # socket.id -> username

@app.route('/')
def home():
    return "Chat Server Running!"

@socketio.on("connect")
def on_connect():
    print("A user connected")

@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    username = connected_users.pop(sid, None)
    if username:
        print(f"{username} disconnected")
        broadcast_user_list()

@socketio.on("register")
def handle_register(username):
    connected_users[request.sid] = username
    print(f"{username} connected")
    broadcast_user_list()

def broadcast_user_list():
    users = list(set(connected_users.values()))
    socketio.emit("user_list", {
        "count": len(users),
        "users": users
    })

@socketio.on("message")
def handle_message(data):
    username = data.get("user", "Anonymous")
    text = data.get("text", "")

    if username in banned_users:
        emit("message", {
            "user": "⚠️ System",
            "text": "⛔ You have been banned for repeated harmful messages."
        }, to=request.sid)
        return

    result = toxicity_classifier(text)
    highest = max(result, key=lambda x: x["score"])

    if highest["label"].lower() == "toxic" and highest["score"] > 0.5:
        warnings[username] = warnings.get(username, 0) + 1

        if warnings[username] >= 3:
            banned_users.add(username)
            emit("message", {
                "user": "⚠️ System",
                "text": f"⛔ {username}, you have been banned for 3 warnings."
            }, to=request.sid)
        else:
            emit("message", {
                "user": "⚠️ System",
                "text": f"⚠️ WARNING {warnings[username]}/3: Harmful message detected -> {text}"
            }, to=request.sid)
    else:
        send({
            "user": username,
            "text": text
        }, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

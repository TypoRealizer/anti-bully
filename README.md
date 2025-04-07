# Anti-Bully Chat App

This is a real-time chat application designed to detect and prevent toxic messages using AI. The backend is built with Flask and Socket.IO, and it uses the `unitary/toxic-bert` model from Hugging Face to analyze message content.

---

## Features

- Real-time chat with Flask-SocketIO
- Detects toxic messages using a pre-trained transformer model
- Issues warnings for harmful messages
- Automatically bans users after three warnings
- Displays a live list of connected users
- Keeps the server logic lightweight and simple

---

## Getting Started

Follow these steps to run the project locally.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/anti-bully.git
cd anti-bully

### 2. inside file
python3 -m venv env
source env/bin/activate

pip install -r req.txt

### 3. run server
python app.py


### 4.frontend
npm start

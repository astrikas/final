import string
import random
from datetime import datetime
from flask import Flask, jsonify, render_template, request
from functools import wraps
from concurrent.futures.process import _MAX_WINDOWS_WORKERS
from pyexpat.errors import messages
import sqlite3
import bcrypt

# connection = sqlite3.connect('DB.db')
# with open('schema.sql') as f:
#     connection.executescript(f.read())
    

# cur = connection.cursor()

# cur.execute("INSERT INTO channels (channel_name, created_by_id) VALUES (?, ?)",
#             ('testchannel', 1)
#             )

# connection.commit()
# connection.close()
    

# cur.execute("INSERT INTO posts (title, content) VALUES (?, ?)",
#             ('First Post', 'Content for the first post')
#             )

# cur.execute("INSERT INTO posts (title, content) VALUES (?, ?)",
#             ('Second Post', 'Content for the second post')
#             )

# connection.commit()


def get_db_connection():    
    connection = sqlite3.connect('DB.db')
    connection.row_factory = sqlite3.Row
    return connection

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# You can store data on your server in whatever structure is most convenient,
# either holding it in memory on your server or in a sqlite database.
# You may use the sample structures below or create your own.

# List of registered users
users = {
    "johnsmith": {"password": "password1234", "session_token": ""},
    
}


chats = {
    "isfanfsainfsain": {
        "magic_phrase": "fsianfainfainfaifnainfa",
        "authorized_users": ["johnsmith"],
        "messages": [
            {"username": "Alice", "body": "Hi Bob!"},
            {"username": "Bob", "body": "Hi Alice!"},
            {"username": "Alice", "body": "Knock knock"},
            {"username": "Bob", "body": "Who's there?"},
        ]
    }
}

def getUser(email, session_token):
    user = query_db('SELECT * FROM users WHERE email = ? AND session_token = ?', [email, session_token], True)
    return user

def validateUser(email, session_token):
    user = getUser(email, session_token)
    if user is None:
        return False
    return True

def hashPassword(password):
    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(9))
    return hashed


def query_db(query, args=(), one=False):
    conn = get_db_connection()
    rv = conn.execute(query, args).fetchall()
    conn.close()
    return (rv[0] if rv else None) if one else rv
# TODO: Include any other routes your app might send users to
def row_to_dict(cursor, row):
    return dict(zip([t[0] for t in cursor.description], row))

# -------------------------------- API ROUTES ----------------------------------

def insertUnread(user_id, channel_id, num_unread):
    conn = get_db_connection()
    cur = conn.execute('INSERT INTO unread (user_id, channel_id, num_unread) VALUES (?,?,?)', [user_id, channel_id, num_unread])
    lastUnreadId = cur.lastrowid
    row = query_db('SELECT * FROM unread WHERE id = ?', [lastUnreadId])
    conn.commit()
    conn.close()
    return row


# TODO: Create the API


# Login
@app.route("/login", methods = ["POST"])
def login():
    email = request.json["email"]
    password = request.json["password"]
    conn = get_db_connection()
    
    user = query_db('SELECT * FROM users WHERE email = ?', [email], True)
 
    if user is None:
        return jsonify({"success" : False, "error_message": 'User not found' })
    
    # check password
    if bcrypt.checkpw(password.encode('utf-8'), user['password']) == False:
        return jsonify({"success" : False, "error_message": 'Wrong password' })
  

    session_token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=20))
    # Update session token in database
    print('updating session token...')
    print(user['password'])
    conn.execute('UPDATE users SET session_token = ? WHERE id = ?', [session_token, user['id']])
    conn.commit()
    conn.close()
    return jsonify({"success" : True, "session_token": session_token, "email": email })
        


# Register
@app.route("/register", methods = ["POST"])
def register():
    conn = get_db_connection()
    # Locate this user in our user dictionary
    username = request.json["username"]
    email = request.json["email"]
    password = request.json["password"]
    user = conn.execute('SELECT * FROM users WHERE email = ?', [email]).fetchall()
    
    if len(user) > 0:
        return jsonify({"success" : False, "error_message": 'Email is already taken' })

    hashedPassword = hashPassword(password)
    session_token = ''.join(random.choices(string.ascii_uppercase + string.digits, k=20))
    conn.execute('INSERT INTO users (username, email, password, session_token) VALUES (?,?,?,?)', [username, email, hashedPassword, session_token])
    conn.commit()
    conn.close()
    return jsonify({"success" : True, "session_token": session_token, "email": email })

# Check if user is logged in by their session token
@app.route("/is_logged_in", methods = ["POST"])
def is_logged_in():
    session_token = request.json["session_token"]
    email = request.json["email"]
    # Locate this user in our user dictionary
    if validateUser(email, session_token):
            # Logged in if sessiojn token and username match
            return jsonify({"success" : True })
    return jsonify({"success" : False })

# List of chats the user is currently in
@app.route("/chats/<email>")
def user_chats(email):
    # Grab session token from header to validate User
    session_token = request.headers['authorization']
    # Locate all chats the user is in
    userChats = []
    if validateUser(email, session_token):
        user = getUser(email, session_token)
        chats = query_db('SELECT *, channels.id as channel_id FROM unread JOIN channels ON unread.channel_id = channels.id WHERE user_id = ?', [user['id']])
        for row in chats:
            userChats.append(dict(row))
        return jsonify({"chats": userChats })
    else:
        return jsonify({"error_message": 'User is not logged in' })

#create chat
@app.route("/create", methods=["POST"])
def create_route():
    session_token = request.json["session_token"]
    email = request.json["email"]
    channel_name = request.json["channel_name"]
    if validateUser(email, session_token):
        # Grab the user for his id
        user = getUser(email, session_token)
        # Create new chat
        conn = get_db_connection()
        cur = conn.execute('INSERT INTO channels (channel_name, created_by_id) VALUES (?,?)', [channel_name, user['id']])
        conn.commit()
        conn.close()
        lastChannelId = cur.lastrowid
    
        chat = query_db('SELECT * FROM channels WHERE id = ?', [lastChannelId], True)
        
        #Insert into unread
        row = insertUnread(user['id'], chat['id'], 0)
     
        jsonChat = {
            "id": chat['id'],
            "channel_name": chat['channel_name'],
            "created_by_id": chat['created_by_id']
        }
        
        return jsonify({"success": True, "chat": jsonChat })
    return jsonify({"success": False})

#Get messages for a particular chat
@app.route("/chat_messages/<chat_id>")
def chat_messages(chat_id):
    # Grab session token from header to validate User
    session_token = request.headers['authorization']
    email = request.headers['email']
    # Grab that chat
    if validateUser(email, session_token):
        chat = query_db('SELECT * FROM channels WHERE id = ?', [chat_id], True)
        if chat is None:
            return jsonify({"error_message": 'No chat found' })
        else:
            # Grab messages associated with chat
            messages = query_db('SELECT messages.*, users.username FROM messages JOIN users ON messages.author_id = users.id WHERE channel_id = ?', [chat['id']], False)
            dictChat = dict(chat)
            dictChat['messages'] = []
            for row in messages:
                dictRow = dict(row)
                if dictRow['replies_to'] is None:
                    dictRow['replies'] = []
                    dictChat['messages'].append(dictRow)
                else: 
                    # If it is a reply attach it to the reply key of the message
                    for index, message in enumerate(dictChat['messages']):
                        if message['id'] == dictRow['replies_to']:
                            dictChat['messages'][index]['replies'].append(dictRow)
                    
            return jsonify({"success": True, "chat": dictChat })
#Get messages using a magic phrase 
@app.route("/magic_phrase/<magic_phrase>")
def chat_messages_using_magic_phrase(magic_phrase):
    # Grab session token from header to validate User
    session_token = request.headers['authorization']
    username = request.headers['username']
    # Grab that chat
    if validateUser(username, session_token):
        for k,v in chats.items():
            if v["magic_phrase"] == magic_phrase:
                chats[k]['authorized_users'].append(username)
                return jsonify({"chat_id": k, "messages": v['messages'], "magic_phrase": v['magic_phrase'] })
    else:
        return jsonify({"error_message": 'User is not logged in' })
    
@app.route("/messages", methods = ["POST"])
def create_message_route():
    session_token = request.headers['authorization']
    email = request.headers['email']

    new_message = request.json["new_message"]
    chat_id = request.json["chat_id"]

    if validateUser(email, session_token):
        # Insert message into database
        user = getUser(email, session_token)
        conn = get_db_connection()
        cur = conn.execute('INSERT INTO messages (channel_id, body, author_id) VALUES (?,?,?)', [chat_id, new_message, user['id']])
        conn.commit()
        conn.close()
        # Grab last message
        message = query_db('SELECT messages.*, users.username FROM messages JOIN users ON messages.author_id = users.id WHERE messages.id = ?', [cur.lastrowid], True)
        return jsonify({"success": True, 'message': dict(message)})
    return jsonify({"success": False})

# @app.route("/auth", methods = ["POST"])
# def get_message_route():
#     user_name = request.json["user_name"]
#     room = request.json["room"]
#     if len(chats)==0:
#         return jsonify("no chats")
#     else:
#         chat_users = chats[int(room)]
#         # for each chat_user object - separate the key / values?
#         for k,v in chat_users['authorized_users'].items():
#             # for each value - get the username
#             # print(v['username'])
#             if v['username'] == user_name:
#                 return jsonify({ "success": True})
        
#         return jsonify({"success": False})

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return app.send_static_file('index.html')
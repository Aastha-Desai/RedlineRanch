# server.py
import socketio
import random
from fastapi import FastAPI

app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

rooms = {}  # code -> [sid, sid]
sid_to_code = {}  # sid -> code

def generate_code():
    return str(random.randint(100000, 999999))

@sio.event
async def connect(sid, environ):
    print(f'Connected: {sid}')

@sio.event
async def disconnect(sid):
    code = sid_to_code.get(sid)
    if code and code in rooms:
        del rooms[code]
        await sio.emit('peer-left', room=code, skip_sid=sid)
    sid_to_code.pop(sid, None)
    print(f'Disconnected: {sid}')

@sio.event
async def create_room(sid):
    code = generate_code()
    rooms[code] = [sid]
    sid_to_code[sid] = code
    await sio.enter_room(sid, code)
    return code  # sends back to client as callback

@sio.event
async def join_room(sid, code):
    if code not in rooms:
        return {'error': 'Invalid code'}
    if len(rooms[code]) >= 2:
        return {'error': 'Room full'}

    rooms[code].append(sid)
    sid_to_code[sid] = code
    await sio.enter_room(sid, code)

    # Tell User A someone joined
    await sio.emit('peer-joined', room=code, skip_sid=sid)
    return {'success': True}

@sio.event
async def offer(sid, sdp):
    code = sid_to_code.get(sid)
    if code:
        await sio.emit('offer', sdp, room=code, skip_sid=sid)

@sio.event
async def answer(sid, sdp):
    code = sid_to_code.get(sid)
    if code:
        await sio.emit('answer', sdp, room=code, skip_sid=sid)

@sio.event
async def ice_candidate(sid, candidate):
    code = sid_to_code.get(sid)
    if code:
        await sio.emit('ice-candidate', candidate, room=code, skip_sid=sid)
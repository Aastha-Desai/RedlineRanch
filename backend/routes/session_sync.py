from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import time, random, string

router = APIRouter(prefix="/sync", tags=["sync"])

# room_code -> team_id mapping
_rooms: dict[str, str] = {}

# team_id -> { player_id -> state }
_store: dict[str, dict[str, dict]] = {}


def generate_code() -> str:
    chars = string.ascii_uppercase + string.digits
    # avoid ambiguous chars
    chars = chars.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
    return "RR-" + "".join(random.choices(chars, k=4))


class CreateRoomRequest(BaseModel):
    team_name: str

class JoinRoomRequest(BaseModel):
    room_code: str
    player_name: str

class PushRequest(BaseModel):
    team_id: str
    player_id: str
    player_name: str
    exercise: str
    reps: int
    heart_rate: Optional[float] = None


@router.post("/create-room")
async def create_room(body: CreateRoomRequest):
    """Create a new room, returns a short code + team_id."""
    # generate unique code
    for _ in range(10):
        code = generate_code()
        if code not in _rooms:
            break

    team_id = code  # use code as team_id for simplicity
    _rooms[code] = team_id
    _store[team_id] = {}

    return {
        "room_code": code,
        "team_id": team_id,
        "team_name": body.team_name,
    }


@router.post("/join-room")
async def join_room(body: JoinRoomRequest):
    """Validate a room code and return the team_id to join."""
    code = body.room_code.strip().upper()
    if code not in _rooms:
        raise HTTPException(status_code=404, detail="Room code not found. Check the code and try again.")
    team_id = _rooms[code]
    return {
        "room_code": code,
        "team_id": team_id,
        "player_name": body.player_name,
    }


@router.post("/push")
async def push(body: PushRequest):
    """Player pushes their current state."""
    if body.team_id not in _store:
        _store[body.team_id] = {}
    _store[body.team_id][body.player_id] = {
        "player_id": body.player_id,
        "player_name": body.player_name,
        "exercise": body.exercise,
        "reps": body.reps,
        "heart_rate": body.heart_rate,
        "updated_at": time.time(),
    }
    return {"ok": True}


@router.get("/state/{team_id}")
async def get_state(team_id: str):
    """Get all players' states for a team."""
    players = list((_store.get(team_id) or {}).values())
    now = time.time()
    players = [p for p in players if now - p["updated_at"] < 15]
    return {"players": players}
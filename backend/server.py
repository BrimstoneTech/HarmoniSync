
import asyncio
import websockets
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HarmoniSyncServer")

# Store connected clients
# structure: { "room_id": { "host": websocket, "listeners": { websocket } } }
# structure: { "room_id": { "host": websocket, "listeners": { websocket }, "name": "...", "users": { ws: username } } }
rooms = {}

async def broadcast(room_id, message, exclude=None):
    if room_id in rooms:
        # Collect all targets
        targets = set(rooms[room_id]["listeners"])
        if rooms[room_id]["host"]:
            targets.add(rooms[room_id]["host"])
        
        if exclude:
            targets.discard(exclude)
            
        if targets:
            aws = [t.send(message) for t in targets]
            await asyncio.gather(*aws, return_exceptions=True)

async def register(websocket):
    """Register a new connection."""
    pass # Managed in the handler loop

async def handler(websocket):
    """Handle incoming WebSocket connections."""
    client_type = None
    room_id = "default"
    
    try:
        async for message in websocket:
            # Check if binary (audio data)
            if isinstance(message, bytes):
                # Broadcast audio to all listeners in the room
                if room_id in rooms and "listeners" in rooms[room_id]:
                    # Forward to all listeners
                    # In a real app, we'd filter or process, but here we relay
                    aws = [listener.send(message) for listener in rooms[room_id]["listeners"]]
                    if aws:
                        await asyncio.gather(*aws, return_exceptions=True)
                continue

            # Handle JSON control messages
            try:
                data = json.loads(message)
                action = data.get("action")
                
                if action == "join":
                    role = data.get("role") # 'host' or 'listener'
                    room_id = data.get("room", "default")
                    
                    if room_id not in rooms:
                        rooms[room_id] = {"host": None, "listeners": set(), "name": room_id, "users": {}}
                    rooms[room_id]["users"][websocket] = data.get("username", "Guest")

                    if role == "host":
                        rooms[room_id]["host"] = websocket
                        client_type = "host"
                        logger.info(f"Host joined room: {room_id}")
                    else:
                        rooms[room_id]["listeners"].add(websocket)
                        client_type = "listener"
                        logger.info(f"Listener joined room: {room_id}")
                    
                    # Notify user
                    await websocket.send(json.dumps({"status": "joined", "role": role, "room": room_id}))
                    
                    # Broadcast join
                    await broadcast(room_id, json.dumps({
                        "action": "user-joined",
                        "id": str(id(websocket)),
                        "username": rooms[room_id]["users"][websocket]
                    }), exclude=websocket)

                elif action == "get-rooms":
                    # Build room list
                    room_list = []
                    for rid, rdata in rooms.items():
                        count = len(rdata["listeners"]) + (1 if rdata["host"] else 0)
                        room_list.append({"name": rdata["name"], "count": count})
                    await websocket.send(json.dumps({"action": "room-list", "rooms": room_list}))

                elif action == "sync":
                    # Host sends time sync data, relay to all listeners
                    if client_type == "host" and room_id in rooms:
                        payload = json.dumps(data)
                        aws = [l.send(payload) for l in rooms[room_id]["listeners"]]
                        if aws:
                            await asyncio.gather(*aws)
            
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        # Cleanup
        if room_id in rooms:
            if client_type == "host" and rooms[room_id]["host"] == websocket:
                rooms[room_id]["host"] = None
                logger.info(f"Host left room: {room_id}")
            elif client_type == "listener" and websocket in rooms[room_id]["listeners"]:
                rooms[room_id]["listeners"].remove(websocket)
                logger.info(f"Listener left room: {room_id}")
            
            if "users" in rooms[room_id] and websocket in rooms[room_id]["users"]:
                del rooms[room_id]["users"][websocket]

            # Broadcast leave
            # We can't await in finally easily properly without managing tasks, 
            # but for this simple server it's okay to skip or use ensure_future if loop running
            # For now, just logging.


async def main():
    async with websockets.serve(handler, "localhost", 8765):
        logger.info("HarmoniSync Signaling Server running on ws://localhost:8765")
        await asyncio.get_running_loop().create_future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped")

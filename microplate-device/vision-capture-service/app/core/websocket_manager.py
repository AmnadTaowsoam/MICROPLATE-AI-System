"""
WebSocket Manager for real-time status updates
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.websockets import WebSocketState

from app.core.config import settings

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
        self.heartbeat_task: Optional[asyncio.Task] = None
    
    async def connect(self, websocket: WebSocket, client_info: Optional[Dict[str, Any]] = None):
        """
        Accept new WebSocket connection
        
        Args:
            websocket: WebSocket connection
            client_info: Optional client information
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_metadata[websocket] = {
            "connected_at": datetime.now(),
            "client_info": client_info or {},
            "last_heartbeat": datetime.now()
        }
        
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
        
        # Send welcome message
        await self.send_personal_message({
            "type": "connection",
            "message": "Connected to Vision Capture Service",
            "timestamp": datetime.now().isoformat()
        }, websocket)
    
    def disconnect(self, websocket: WebSocket):
        """
        Remove WebSocket connection
        
        Args:
            websocket: WebSocket connection to remove
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
        
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """
        Send message to specific WebSocket connection
        
        Args:
            message: Message to send
            websocket: Target WebSocket connection
        """
        try:
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcast message to all connected WebSockets
        
        Args:
            message: Message to broadcast
        """
        if not self.active_connections:
            return
        
        # Create a copy of connections to avoid modification during iteration
        connections = self.active_connections.copy()
        
        for connection in connections:
            await self.send_personal_message(message, connection)
    
    async def broadcast_status_update(self, status_data: Dict[str, Any]):
        """
        Broadcast camera status update
        
        Args:
            status_data: Camera status data
        """
        message = {
            "type": "status_update",
            "data": status_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def broadcast_capture_progress(self, progress_data: Dict[str, Any]):
        """
        Broadcast capture progress update
        
        Args:
            progress_data: Capture progress data
        """
        message = {
            "type": "capture_progress",
            "data": progress_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def broadcast_capture_result(self, result_data: Dict[str, Any]):
        """
        Broadcast capture result
        
        Args:
            result_data: Capture result data
        """
        message = {
            "type": "capture_result",
            "data": result_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.broadcast(message)
    
    async def start_heartbeat(self):
        """Start heartbeat monitoring for WebSocket connections"""
        if self.heartbeat_task and not self.heartbeat_task.done():
            return
        
        self.heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        logger.info("WebSocket heartbeat monitoring started")
    
    async def stop_heartbeat(self):
        """Stop heartbeat monitoring"""
        if self.heartbeat_task and not self.heartbeat_task.done():
            self.heartbeat_task.cancel()
            try:
                await self.heartbeat_task
            except asyncio.CancelledError:
                pass
            logger.info("WebSocket heartbeat monitoring stopped")
    
    async def _heartbeat_loop(self):
        """Heartbeat monitoring loop"""
        while True:
            try:
                await asyncio.sleep(settings.WS_HEARTBEAT_INTERVAL)
                
                # Check connections and send heartbeat
                connections_to_remove = []
                
                for websocket in self.active_connections.copy():
                    try:
                        if websocket.client_state == WebSocketState.CONNECTED:
                            await self.send_personal_message({
                                "type": "heartbeat",
                                "timestamp": datetime.now().isoformat()
                            }, websocket)
                            
                            # Update last heartbeat time
                            if websocket in self.connection_metadata:
                                self.connection_metadata[websocket]["last_heartbeat"] = datetime.now()
                        else:
                            connections_to_remove.append(websocket)
                    except Exception as e:
                        logger.warning(f"Heartbeat failed for connection: {e}")
                        connections_to_remove.append(websocket)
                
                # Remove disconnected connections
                for websocket in connections_to_remove:
                    self.disconnect(websocket)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Heartbeat loop error: {e}")
    
    async def cleanup(self):
        """Cleanup WebSocket manager"""
        await self.stop_heartbeat()
        
        # Close all connections
        for websocket in self.active_connections.copy():
            try:
                await websocket.close()
            except Exception as e:
                logger.warning(f"Error closing WebSocket: {e}")
        
        self.active_connections.clear()
        self.connection_metadata.clear()
        logger.info("WebSocket manager cleaned up")
    
    def get_connection_count(self) -> int:
        """Get number of active connections"""
        return len(self.active_connections)
    
    def get_connection_info(self) -> List[Dict[str, Any]]:
        """Get information about all connections"""
        info = []
        for websocket, metadata in self.connection_metadata.items():
            info.append({
                "connected_at": metadata["connected_at"].isoformat(),
                "client_info": metadata["client_info"],
                "last_heartbeat": metadata["last_heartbeat"].isoformat()
            })
        return info

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

interface SocketClient extends WebSocket {
    userId?: string;
    roomId?: string;
}

class SocketService {
    private wss: WebSocketServer;

    constructor(server: Server) {
        this.wss = new WebSocketServer({ server });
        this.init();
    }

    private init(): void {
        this.wss.on('connection', (ws: SocketClient) => {
            console.log('New client connected');

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('Invalid message format:', error);
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });
    }

    private handleMessage(ws: SocketClient, data: any): void {
        switch (data.type) {
            case 'join_room':
                ws.userId = data.userId;
                ws.roomId = data.roomId;
                this.broadcastToRoom(data.roomId, {
                    type: 'user_joined',
                    userId: data.userId
                });
                break;

            case 'leave_room':
                this.broadcastToRoom(ws.roomId!, {
                    type: 'user_left',
                    userId: ws.userId
                });
                ws.roomId = undefined;
                break;
        }
    }

    public broadcastToRoom(roomId: string, data: any): void {
        this.wss.clients.forEach((client: SocketClient) => {
            if (client.roomId === roomId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }
}

export default SocketService;

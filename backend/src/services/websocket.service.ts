import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { config } from '../config';

let io: SocketIOServer | null = null;

export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: [config.frontend.url, 'http://localhost:5173', 'http://localhost:3000'].filter(Boolean),
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Authentication middleware for socket connections
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        const decoded = verifyAccessToken(token);
        if (!decoded) {
            return next(new Error('Invalid token'));
        }

        (socket as any).userId = decoded.userId;
        (socket as any).userRole = decoded.role;
        next();
    });

    io.on('connection', (socket: Socket) => {
        const userId = (socket as any).userId;
        const userRole = (socket as any).userRole;

        // Join user-specific room
        socket.join(`user:${userId}`);

        // Admin joins admin room
        if (userRole === 'admin') {
            socket.join('admin');
        }

        logger.info(`WebSocket: User ${userId} connected`);

        socket.on('disconnect', () => {
            logger.info(`WebSocket: User ${userId} disconnected`);
        });
    });

    logger.info('WebSocket server initialized');
    return io;
}

export function getIO(): SocketIOServer | null {
    return io;
}

// Emit events
export function emitOrderStatusUpdate(userId: number, orderId: number, status: string): void {
    if (!io) return;
    io.to(`user:${userId}`).emit('order:statusUpdate', { orderId, status, timestamp: new Date() });
    io.to('admin').emit('order:statusUpdate', { orderId, userId, status, timestamp: new Date() });
}

export function emitNewOrder(orderId: number, userId: number): void {
    if (!io) return;
    io.to('admin').emit('order:new', { orderId, userId, timestamp: new Date() });
}

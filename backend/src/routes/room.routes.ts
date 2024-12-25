import { Router } from 'express';
import { createRoom, getRooms, joinRoom, leaveRoom } from '../controllers/room.controller';
import { validate } from '../middleware/validate.middleware';
import { createRoomSchema } from '../schemas/room.schema';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authMiddleware, validate(createRoomSchema), createRoom);
router.get('/', authMiddleware, getRooms);
router.post('/:roomId/join', authMiddleware, joinRoom);
router.post('/:roomId/leave', authMiddleware, leaveRoom);

export default router;
import { Router } from 'express';
import { WishlistController } from '../controllers/wishlist.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', WishlistController.getAll);
router.post('/', WishlistController.add);
router.get('/check/:productId', WishlistController.check);
router.delete('/:productId', WishlistController.remove);

export default router;

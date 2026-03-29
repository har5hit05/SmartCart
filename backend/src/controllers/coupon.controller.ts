import { Request, Response } from 'express';
import { CouponModel } from '../models/Coupon';
import { AuthRequest } from '../middlewares/auth.middleware';
import { logger } from '../utils/logger';

export class CouponController {
    /** POST /api/coupons/validate — Validate and preview coupon discount */
    static async validate(req: Request, res: Response): Promise<void> {
        try {
            const authReq = req as AuthRequest;
            const { code, order_total } = req.body;

            if (!code || order_total === undefined) {
                res.status(400).json({ success: false, message: 'Coupon code and order total are required' });
                return;
            }

            const result = await CouponModel.validate(code, authReq.user!.id, Number(order_total));

            res.status(result.valid ? 200 : 400).json({
                success: result.valid,
                message: result.message,
                data: result.valid
                    ? {
                          coupon_id: result.coupon!.id,
                          code: result.coupon!.code,
                          description: result.coupon!.description,
                          discount_type: result.coupon!.discount_type,
                          discount_value: result.coupon!.discount_value,
                          discount_amount: result.discount_amount,
                      }
                    : undefined,
            });
        } catch (error) {
            logger.error('Validate coupon error', error);
            res.status(500).json({ success: false, message: 'Failed to validate coupon' });
        }
    }

    /** GET /api/coupons/available — List available coupons for user */
    static async getAvailable(req: Request, res: Response): Promise<void> {
        try {
            const coupons = await CouponModel.getActiveCoupons();

            const publicCoupons = coupons.map((c) => ({
                code: c.code,
                description: c.description,
                discount_type: c.discount_type,
                discount_value: c.discount_value,
                min_order_value: c.min_order_value,
                max_discount: c.max_discount,
                expires_at: c.expires_at,
            }));

            res.status(200).json({ success: true, data: publicCoupons });
        } catch (error) {
            logger.error('Get available coupons error', error);
            res.status(500).json({ success: false, message: 'Failed to get coupons' });
        }
    }

    // ---- Admin endpoints ----

    /** GET /api/admin/coupons — List all coupons */
    static async getAll(req: Request, res: Response): Promise<void> {
        try {
            const coupons = await CouponModel.findAll();
            res.status(200).json({ success: true, data: coupons });
        } catch (error) {
            logger.error('Get all coupons error', error);
            res.status(500).json({ success: false, message: 'Failed to get coupons' });
        }
    }

    /** POST /api/admin/coupons — Create coupon */
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const coupon = await CouponModel.create(req.body);
            res.status(201).json({ success: true, data: coupon });
        } catch (error: any) {
            if (error.code === '23505') {
                res.status(409).json({ success: false, message: 'A coupon with this code already exists' });
                return;
            }
            logger.error('Create coupon error', error);
            res.status(500).json({ success: false, message: 'Failed to create coupon' });
        }
    }

    /** PUT /api/admin/coupons/:id — Update coupon */
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            const coupon = await CouponModel.update(id, req.body);
            if (!coupon) {
                res.status(404).json({ success: false, message: 'Coupon not found' });
                return;
            }
            res.status(200).json({ success: true, data: coupon });
        } catch (error) {
            logger.error('Update coupon error', error);
            res.status(500).json({ success: false, message: 'Failed to update coupon' });
        }
    }

    /** DELETE /api/admin/coupons/:id — Delete coupon */
    static async delete(req: Request, res: Response): Promise<void> {
        try {
            const id = parseInt(req.params.id as string);
            const deleted = await CouponModel.delete(id);
            if (!deleted) {
                res.status(404).json({ success: false, message: 'Coupon not found' });
                return;
            }
            res.status(200).json({ success: true, message: 'Coupon deleted' });
        } catch (error) {
            logger.error('Delete coupon error', error);
            res.status(500).json({ success: false, message: 'Failed to delete coupon' });
        }
    }
}

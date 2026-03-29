import PDFDocument from 'pdfkit';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

interface OrderData {
    id: number;
    user_name: string;
    user_email: string;
    status: string;
    subtotal: number;
    tax: number;
    shipping_fee: number;
    discount_amount: number;
    total: number;
    payment_method: string;
    payment_status: string;
    shipping_address_line1?: string;
    shipping_address_line2?: string;
    shipping_city?: string;
    shipping_state?: string;
    shipping_postal_code?: string;
    shipping_country?: string;
    shipping_phone?: string;
    created_at: Date;
    items: Array<{
        product_name: string;
        quantity: number;
        unit_price: number;
        subtotal: number;
    }>;
    coupon_code?: string;
}

// Helper to format currency
const fmt = (n: number): string => {
    const num = Number(n) || 0;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export class InvoiceService {
    static async generateInvoice(orderId: number, userId: number): Promise<Buffer> {
        const orderResult = await pool.query(
            `SELECT o.*, u.full_name AS user_name, u.email AS user_email, c.code AS coupon_code
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN coupons c ON c.id = o.coupon_id
             WHERE o.id = $1 AND o.user_id = $2`,
            [orderId, userId]
        );

        if (orderResult.rows.length === 0) {
            throw new Error('Order not found');
        }

        const order = orderResult.rows[0] as OrderData;

        const itemsResult = await pool.query(
            `SELECT oi.quantity, oi.unit_price, oi.subtotal, oi.product_name
             FROM order_items oi
             WHERE oi.order_id = $1
             ORDER BY oi.id`,
            [orderId]
        );

        order.items = itemsResult.rows;
        return this.createPDF(order);
    }

    static async generateInvoiceAdmin(orderId: number): Promise<Buffer> {
        const orderResult = await pool.query(
            `SELECT o.*, u.full_name AS user_name, u.email AS user_email, c.code AS coupon_code
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN coupons c ON c.id = o.coupon_id
             WHERE o.id = $1`,
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            throw new Error('Order not found');
        }

        const order = orderResult.rows[0] as OrderData;

        const itemsResult = await pool.query(
            `SELECT oi.quantity, oi.unit_price, oi.subtotal, oi.product_name
             FROM order_items oi
             WHERE oi.order_id = $1
             ORDER BY oi.id`,
            [orderId]
        );

        order.items = itemsResult.rows;
        return this.createPDF(order);
    }

    private static createPDF(order: OrderData): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const chunks: Buffer[] = [];

                doc.on('data', (chunk: Buffer) => chunks.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(chunks)));
                doc.on('error', reject);

                const leftMargin = 50;
                const rightEdge = 545;
                const pageWidth = rightEdge - leftMargin;
                const invoiceDate = new Date(order.created_at);

                // ═══════════════════════════════════════════
                // HEADER — Brand + Invoice Title
                // ═══════════════════════════════════════════

                // Brand name
                doc.fontSize(26).font('Helvetica-Bold').fillColor('#4F46E5')
                    .text('SmartCart', leftMargin, 35);
                doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF')
                    .text('AI-Powered E-Commerce Platform', leftMargin, 64);

                // INVOICE title — right side
                doc.fontSize(30).font('Helvetica-Bold').fillColor('#111827')
                    .text('INVOICE', 350, 30, { align: 'right' });

                // Invoice meta — right aligned
                const metaX = 350;
                let metaY = 68;
                doc.fontSize(9).font('Helvetica').fillColor('#6B7280');

                const metaLines = [
                    ['Invoice No', `INV-${String(order.id).padStart(6, '0')}`],
                    ['Date', invoiceDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
                    ['Status', order.status],
                    ['Payment', order.payment_method || 'COD'],
                ];

                metaLines.forEach(([label, value]) => {
                    doc.font('Helvetica').fillColor('#9CA3AF')
                        .text(`${label}:`, metaX, metaY, { width: 75, align: 'right' });
                    doc.font('Helvetica-Bold').fillColor('#374151')
                        .text(value, metaX + 80, metaY, { width: 115, align: 'right' });
                    metaY += 14;
                });

                // Accent line under header
                const accentY = 130;
                doc.rect(leftMargin, accentY, pageWidth, 3).fill('#4F46E5');

                // ═══════════════════════════════════════════
                // BILLING + SHIPPING INFO
                // ═══════════════════════════════════════════

                let y = accentY + 20;

                // Bill To — left column
                doc.roundedRect(leftMargin, y, pageWidth / 2 - 10, 85, 4)
                    .fillAndStroke('#F9FAFB', '#E5E7EB');

                doc.fontSize(8).font('Helvetica-Bold').fillColor('#4F46E5')
                    .text('BILL TO', leftMargin + 12, y + 10);
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827')
                    .text(order.user_name, leftMargin + 12, y + 26);
                doc.fontSize(9).font('Helvetica').fillColor('#6B7280')
                    .text(order.user_email, leftMargin + 12, y + 42);

                // Ship To — right column
                const shipX = leftMargin + pageWidth / 2 + 10;
                doc.roundedRect(shipX, y, pageWidth / 2 - 10, 85, 4)
                    .fillAndStroke('#F9FAFB', '#E5E7EB');

                doc.fontSize(8).font('Helvetica-Bold').fillColor('#4F46E5')
                    .text('SHIP TO', shipX + 12, y + 10);

                let shipY = y + 26;
                doc.fontSize(9).font('Helvetica').fillColor('#374151');
                if (order.shipping_address_line1) {
                    doc.text(order.shipping_address_line1, shipX + 12, shipY, { width: pageWidth / 2 - 35 });
                    shipY += 13;
                }
                if (order.shipping_address_line2) {
                    doc.text(order.shipping_address_line2, shipX + 12, shipY, { width: pageWidth / 2 - 35 });
                    shipY += 13;
                }
                const cityLine = [order.shipping_city, order.shipping_state, order.shipping_postal_code].filter(Boolean).join(', ');
                if (cityLine) {
                    doc.text(cityLine, shipX + 12, shipY, { width: pageWidth / 2 - 35 });
                    shipY += 13;
                }
                if (order.shipping_phone) {
                    doc.text(`Ph: ${order.shipping_phone}`, shipX + 12, shipY, { width: pageWidth / 2 - 35 });
                }

                // ═══════════════════════════════════════════
                // ITEMS TABLE
                // ═══════════════════════════════════════════

                y += 105;

                // Table header
                const colX = { num: 58, product: 90, qty: 340, price: 395, total: 470 };

                doc.rect(leftMargin, y, pageWidth, 30).fill('#4F46E5');
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
                doc.text('#', colX.num, y + 9, { width: 25 });
                doc.text('PRODUCT', colX.product, y + 9, { width: 240 });
                doc.text('QTY', colX.qty, y + 9, { width: 45, align: 'center' });
                doc.text('PRICE', colX.price, y + 9, { width: 65, align: 'right' });
                doc.text('AMOUNT', colX.total, y + 9, { width: 70, align: 'right' });
                y += 30;

                // Table rows
                order.items.forEach((item, index) => {
                    const itemTotal = Number(item.subtotal) || (Number(item.unit_price) * item.quantity);
                    const rowHeight = 28;

                    // Alternating row background
                    if (index % 2 === 0) {
                        doc.rect(leftMargin, y, pageWidth, rowHeight).fill('#F8FAFC');
                    } else {
                        doc.rect(leftMargin, y, pageWidth, rowHeight).fill('#FFFFFF');
                    }

                    // Row border bottom
                    doc.moveTo(leftMargin, y + rowHeight).lineTo(rightEdge, y + rowHeight)
                        .strokeColor('#F1F5F9').lineWidth(0.5).stroke();

                    const textY = y + 8;
                    doc.fontSize(9).font('Helvetica').fillColor('#6B7280')
                        .text(`${index + 1}`, colX.num, textY, { width: 25 });
                    doc.font('Helvetica-Bold').fillColor('#1F2937')
                        .text(item.product_name, colX.product, textY, { width: 240 });
                    doc.font('Helvetica').fillColor('#374151')
                        .text(`${item.quantity}`, colX.qty, textY, { width: 45, align: 'center' });
                    doc.text(`₹${fmt(Number(item.unit_price))}`, colX.price, textY, { width: 65, align: 'right' });
                    doc.font('Helvetica-Bold').fillColor('#111827')
                        .text(`₹${fmt(itemTotal)}`, colX.total, textY, { width: 70, align: 'right' });

                    y += rowHeight;
                });

                // Table bottom border
                doc.moveTo(leftMargin, y).lineTo(rightEdge, y).strokeColor('#CBD5E1').lineWidth(1).stroke();

                // ═══════════════════════════════════════════
                // TOTALS SECTION — right aligned
                // ═══════════════════════════════════════════

                y += 18;
                const labelX = 370;
                const valueX = 470;
                const labelW = 90;
                const valueW = 70;

                // Use actual DB values (not recalculated)
                const subtotal = Number(order.subtotal) || 0;
                const tax = Number(order.tax) || 0;
                const shippingFee = Number(order.shipping_fee) || 0;
                const discount = Number(order.discount_amount) || 0;
                const total = Number(order.total) || 0;

                // Subtotal
                doc.fontSize(9).font('Helvetica').fillColor('#6B7280')
                    .text('Subtotal:', labelX, y, { width: labelW, align: 'right' });
                doc.font('Helvetica').fillColor('#1F2937')
                    .text(`₹${fmt(subtotal)}`, valueX, y, { width: valueW, align: 'right' });

                // Tax
                y += 18;
                doc.font('Helvetica').fillColor('#6B7280')
                    .text('GST (18%):', labelX, y, { width: labelW, align: 'right' });
                doc.fillColor('#1F2937')
                    .text(`₹${fmt(tax)}`, valueX, y, { width: valueW, align: 'right' });

                // Shipping
                y += 18;
                doc.font('Helvetica').fillColor('#6B7280')
                    .text('Shipping:', labelX, y, { width: labelW, align: 'right' });
                if (shippingFee === 0) {
                    doc.font('Helvetica-Bold').fillColor('#059669')
                        .text('FREE', valueX, y, { width: valueW, align: 'right' });
                } else {
                    doc.fillColor('#1F2937')
                        .text(`₹${fmt(shippingFee)}`, valueX, y, { width: valueW, align: 'right' });
                }

                // Discount (only show if > 0)
                if (discount > 0) {
                    y += 18;
                    const discountLabel = order.coupon_code ? `Discount (${order.coupon_code}):` : 'Discount:';
                    doc.font('Helvetica').fillColor('#6B7280')
                        .text(discountLabel, labelX - 20, y, { width: labelW + 20, align: 'right' });
                    doc.font('Helvetica-Bold').fillColor('#DC2626')
                        .text(`-₹${fmt(discount)}`, valueX, y, { width: valueW, align: 'right' });
                }

                // Divider before total
                y += 22;
                doc.moveTo(labelX, y).lineTo(rightEdge, y).strokeColor('#CBD5E1').lineWidth(0.5).stroke();

                // Grand Total — highlighted box
                y += 8;
                const totalBoxX = labelX - 5;
                const totalBoxW = rightEdge - totalBoxX;
                doc.roundedRect(totalBoxX, y, totalBoxW, 34, 4).fill('#4F46E5');

                doc.fontSize(12).font('Helvetica-Bold').fillColor('#FFFFFF')
                    .text('TOTAL:', labelX + 5, y + 9, { width: labelW - 10, align: 'right' });
                doc.fontSize(13).font('Helvetica-Bold').fillColor('#FFFFFF')
                    .text(`₹${fmt(total)}`, valueX - 10, y + 8, { width: valueW + 15, align: 'right' });

                // ═══════════════════════════════════════════
                // FOOTER
                // ═══════════════════════════════════════════

                y += 60;

                // Thank you note
                doc.roundedRect(leftMargin, y, pageWidth, 50, 4)
                    .fillAndStroke('#F8FAFC', '#E5E7EB');

                doc.fontSize(10).font('Helvetica-Bold').fillColor('#4F46E5')
                    .text('Thank you for shopping with SmartCart!', leftMargin, y + 12, { align: 'center', width: pageWidth });
                doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF')
                    .text('This is a computer-generated invoice and does not require a physical signature.', leftMargin, y + 30, { align: 'center', width: pageWidth });

                doc.end();
            } catch (error) {
                logger.error('PDF generation error', error);
                reject(error);
            }
        });
    }
}

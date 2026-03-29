-- Clear existing products (optional - comment out if you want to keep existing)
-- DELETE FROM order_items; DELETE FROM orders; DELETE FROM cart_items; DELETE FROM wishlist; DELETE FROM reviews;
-- DELETE FROM products;

-- Insert 50 realistic products across 8 categories
INSERT INTO products (name, description, price, category, stock_quantity, image_url, is_active) VALUES

-- Electronics (10 products)
('Wireless Bluetooth Earbuds', 'Premium TWS earbuds with ANC, 30hr battery life, IPX5 water resistant', 2499.00, 'Electronics', 150, 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=500', TRUE),
('Mechanical Gaming Keyboard', 'RGB backlit mechanical keyboard with Cherry MX Blue switches, USB-C', 3999.00, 'Electronics', 75, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500', TRUE),
('27-inch 4K Monitor', 'IPS display, HDR400, 99% sRGB, USB-C connectivity, adjustable stand', 24999.00, 'Electronics', 30, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=500', TRUE),
('Portable Bluetooth Speaker', 'Waterproof portable speaker with 360-degree sound, 20hr battery', 1799.00, 'Electronics', 200, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500', TRUE),
('USB-C Hub 7-in-1', 'Multi-port adapter: HDMI 4K, USB 3.0, SD card, PD charging', 1299.00, 'Electronics', 120, 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500', TRUE),
('Wireless Gaming Mouse', 'Ergonomic mouse with 16000 DPI sensor, RGB, 70hr battery life', 1999.00, 'Electronics', 100, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500', TRUE),
('Fast Wireless Charger', '15W Qi wireless charging pad with LED indicator, compatible with all Qi devices', 799.00, 'Electronics', 250, 'https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=500', TRUE),
('Smart Watch Fitness Tracker', 'AMOLED display, heart rate monitor, SpO2, GPS, 7-day battery', 4999.00, 'Electronics', 60, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', TRUE),
('Noise Cancelling Headphones', 'Over-ear ANC headphones, 40hr battery, Hi-Res Audio, foldable design', 5999.00, 'Electronics', 45, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', TRUE),
('Webcam Full HD 1080p', 'Autofocus webcam with dual microphones, privacy cover, tripod mount', 1499.00, 'Electronics', 80, 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=500', TRUE),

-- Fashion (8 products)
('Classic Cotton Polo T-Shirt', 'Premium cotton polo in navy blue, breathable fabric, regular fit', 899.00, 'Fashion', 300, 'https://images.unsplash.com/photo-1625910513413-5fc42fc1e773?w=500', TRUE),
('Slim Fit Denim Jeans', 'Stretch denim jeans in dark wash, comfortable everyday wear', 1499.00, 'Fashion', 200, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', TRUE),
('Leather Belt - Brown', 'Genuine leather belt with brushed steel buckle, 35mm width', 699.00, 'Fashion', 150, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', TRUE),
('Running Shoes - Lightweight', 'Mesh upper running shoes with EVA midsole, great for daily runs', 2999.00, 'Fashion', 100, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', TRUE),
('Aviator Sunglasses', 'UV400 polarized aviator sunglasses with metal frame', 1199.00, 'Fashion', 180, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=500', TRUE),
('Canvas Backpack', 'Vintage canvas backpack with laptop compartment, water resistant', 1599.00, 'Fashion', 90, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', TRUE),
('Formal Oxford Shoes', 'Genuine leather oxford shoes in black, classic design for office wear', 3499.00, 'Fashion', 65, 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=500', TRUE),
('Wrist Watch - Minimalist', 'Analog quartz watch with leather strap, Japanese movement, 40mm dial', 2499.00, 'Fashion', 70, 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=500', TRUE),

-- Home & Kitchen (7 products)
('Stainless Steel Bottle 1L', 'Double-wall vacuum insulated, keeps hot 12hr / cold 24hr', 599.00, 'Home & Kitchen', 400, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500', TRUE),
('Non-Stick Cookware Set', '5-piece cookware set with glass lids, induction compatible', 3499.00, 'Home & Kitchen', 40, 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500', TRUE),
('Memory Foam Pillow', 'Cervical support pillow with cooling gel, washable bamboo cover', 1299.00, 'Home & Kitchen', 120, 'https://images.unsplash.com/photo-1592789705501-f9ae4287c4b9?w=500', TRUE),
('LED Desk Lamp', 'Adjustable LED lamp with 5 brightness levels, USB charging port', 999.00, 'Home & Kitchen', 160, 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=500', TRUE),
('Coffee Maker Machine', 'Drip coffee maker, 10-cup capacity, programmable timer, anti-drip', 2999.00, 'Home & Kitchen', 35, 'https://images.unsplash.com/photo-1517256064527-9d164d946d65?w=500', TRUE),
('Air Purifier HEPA', 'True HEPA filter, covers 400 sq ft, PM2.5 sensor, sleep mode', 7999.00, 'Home & Kitchen', 25, 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=500', TRUE),
('Ceramic Dinner Set 18pc', 'Microwave-safe ceramic dinnerware, elegant white with gold rim', 2499.00, 'Home & Kitchen', 50, 'https://images.unsplash.com/photo-1603199506016-5c428f5bf5a0?w=500', TRUE),

-- Books (6 products)
('Atomic Habits by James Clear', 'Tiny changes, remarkable results. #1 bestseller on building habits', 399.00, 'Books', 500, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500', TRUE),
('The Psychology of Money', 'Morgan Housel - Timeless lessons on wealth, greed, and happiness', 349.00, 'Books', 400, 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=500', TRUE),
('Clean Code by Robert Martin', 'A handbook of agile software craftsmanship - must read for developers', 499.00, 'Books', 200, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=500', TRUE),
('System Design Interview Vol 1', 'Alex Xu - Step by step guide to system design interview preparation', 599.00, 'Books', 180, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500', TRUE),
('Deep Work by Cal Newport', 'Rules for focused success in a distracted world', 379.00, 'Books', 350, 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?w=500', TRUE),
('Sapiens by Yuval Noah Harari', 'A brief history of humankind - global bestseller', 449.00, 'Books', 300, 'https://images.unsplash.com/photo-1589998059171-988d887df646?w=500', TRUE),

-- Sports & Fitness (5 products)
('Yoga Mat Premium 6mm', 'Non-slip TPE yoga mat with alignment lines, carry strap included', 999.00, 'Sports & Fitness', 200, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500', TRUE),
('Adjustable Dumbbell Set', '2.5kg to 24kg adjustable dumbbells with quick-lock mechanism', 8999.00, 'Sports & Fitness', 30, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500', TRUE),
('Resistance Bands Set', '5-level resistance bands with handles, door anchor, ankle straps', 699.00, 'Sports & Fitness', 250, 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=500', TRUE),
('Skipping Rope - Speed', 'Ball bearing jump rope with foam handles, adjustable cable length', 399.00, 'Sports & Fitness', 300, 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500', TRUE),
('Protein Shaker Bottle 700ml', 'BPA-free shaker with mixing ball, leak-proof lid, measurement marks', 299.00, 'Sports & Fitness', 400, 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=500', TRUE),

-- Stationery (5 products)
('Premium Notebook A5 Ruled', 'Hardcover notebook, 192 pages, acid-free paper, lay-flat binding', 349.00, 'Stationery', 300, 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500', TRUE),
('Fountain Pen Gift Set', 'Stainless steel fountain pen with converter, 3 ink cartridges included', 1499.00, 'Stationery', 80, 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=500', TRUE),
('Desk Organizer Wooden', 'Multi-compartment wooden desk organizer for pens, cards, and supplies', 899.00, 'Stationery', 100, 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=500', TRUE),
('Art Marker Set 48 Colors', 'Dual-tip markers with fine and broad tips, alcohol-based ink', 1299.00, 'Stationery', 60, 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500', TRUE),
('Sticky Notes Multipack', '8 pads of 100 sheets each, assorted neon colors, 3x3 inches', 199.00, 'Stationery', 500, 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500', TRUE),

-- Personal Care (5 products)
('Electric Toothbrush', 'Sonic toothbrush with 5 modes, 2-minute timer, 30-day battery', 1999.00, 'Personal Care', 90, 'https://images.unsplash.com/photo-1559591937-abc9435723e3?w=500', TRUE),
('Beard Grooming Kit', 'Beard oil, balm, wooden comb, scissors, and boar bristle brush', 899.00, 'Personal Care', 120, 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=500', TRUE),
('Aromatherapy Diffuser', 'Ultrasonic essential oil diffuser with LED lights, 300ml capacity', 1299.00, 'Personal Care', 70, 'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=500', TRUE),
('Skincare Gift Box', 'Face wash, moisturizer, sunscreen SPF50, and vitamin C serum combo', 1599.00, 'Personal Care', 60, 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500', TRUE),

-- Gaming (4 products)
('Gaming Controller Wireless', 'Bluetooth gaming controller compatible with PC, mobile, and Switch', 2499.00, 'Gaming', 80, 'https://images.unsplash.com/photo-1592840496694-26d035b52b48?w=500', TRUE),
('RGB Mouse Pad XL', 'Extended gaming mouse pad with RGB edge lighting, non-slip rubber base', 999.00, 'Gaming', 150, 'https://images.unsplash.com/photo-1616588589676-62b3d4ff6e04?w=500', TRUE),
('Gaming Headset 7.1', 'Surround sound gaming headset with detachable mic, memory foam earpads', 2999.00, 'Gaming', 55, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500', TRUE),
('Capture Card HD', '1080p60 USB capture card for game streaming and recording', 4999.00, 'Gaming', 40, 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=500', TRUE)

ON CONFLICT DO NOTHING;

-- Update search vectors for new products
UPDATE products SET search_vector = to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, ''))
WHERE search_vector IS NULL;

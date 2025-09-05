-- Insert test order data for current session
-- User: aaffa36b-aa44-498b-876f-9e92d3867560
-- Session: ff25e215-16e0-48a0-8977-b783e7d29d42_1_3c4d8be2-85bd-4c72-9b6e-748d6e1abf42
-- Table: 1

-- First, let's check current menu items to use valid menuItemId
-- SELECT id, name FROM menu_items WHERE active = true LIMIT 5;

-- Create a test order
INSERT INTO orders (
    id, 
    table_number, 
    session_id, 
    user_id, 
    status, 
    created_at, 
    updated_at
) VALUES (
    'test-order-1-' || datetime('now'),
    1,
    'ff25e215-16e0-48a0-8977-b783e7d29d42_1_3c4d8be2-85bd-4c72-9b6e-748d6e1abf42',
    'aaffa36b-aa44-498b-876f-9e92d3867560',
    'Placed',
    datetime('now'),
    datetime('now')
);

-- Get the order ID we just created
-- We'll use a subquery to get the latest order for this session
INSERT INTO order_items (
    id,
    order_id,
    menu_item_id,
    quantity,
    price,
    status,
    created_at,
    updated_at
) VALUES (
    'test-order-item-1-' || datetime('now'),
    (SELECT id FROM orders WHERE session_id = 'ff25e215-16e0-48a0-8977-b783e7d29d42_1_3c4d8be2-85bd-4c72-9b6e-748d6e1abf42' ORDER BY created_at DESC LIMIT 1),
    (SELECT id FROM menu_items WHERE active = true LIMIT 1), -- Get first active menu item
    2,
    15.99,
    'Placed',
    datetime('now'),
    datetime('now')
);

-- Add another item to the same order
INSERT INTO order_items (
    id,
    order_id,
    menu_item_id,
    quantity,
    price,
    status,
    created_at,
    updated_at
) VALUES (
    'test-order-item-2-' || datetime('now'),
    (SELECT id FROM orders WHERE session_id = 'ff25e215-16e0-48a0-8977-b783e7d29d42_1_3c4d8be2-85bd-4c72-9b6e-748d6e1abf42' ORDER BY created_at DESC LIMIT 1),
    (SELECT id FROM menu_items WHERE active = true LIMIT 1 OFFSET 1), -- Get second active menu item
    1,
    8.50,
    'InProgress',
    datetime('now'),
    datetime('now')
);

-- Check the results
SELECT o.id as order_id, o.status as order_status, o.created_at,
       oi.id as item_id, oi.quantity, oi.price, oi.status as item_status,
       mi.name as menu_item_name
FROM orders o 
JOIN order_items oi ON o.id = oi.order_id 
JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE o.session_id = 'ff25e215-16e0-48a0-8977-b783e7d29d42_1_3c4d8be2-85bd-4c72-9b6e-748d6e1abf42'
ORDER BY o.created_at DESC, oi.created_at;

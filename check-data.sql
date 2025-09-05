-- Check key tables for data
SELECT 'access_users' as table_name, count(*) as row_count FROM access_users
UNION ALL
SELECT 'waiter' as table_name, count(*) as row_count FROM waiter
UNION ALL
SELECT 'menu_item' as table_name, count(*) as row_count FROM menu_item
UNION ALL
SELECT 'order_status_config' as table_name, count(*) as row_count FROM order_status_config
UNION ALL
SELECT 'request_status_config' as table_name, count(*) as row_count FROM request_status_config
ORDER BY table_name;

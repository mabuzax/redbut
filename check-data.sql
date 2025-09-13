-- Check key tables for data
SELECT 'access_users' as table_name, count(*) as row_count FROM access_users
UNION ALL
SELECT 'waiter' as table_name, count(*) as row_count FROM waiter
UNION ALL
SELECT 'menu_item' as table_name, count(*) as row_count FROM menu_item
ORDER BY table_name;

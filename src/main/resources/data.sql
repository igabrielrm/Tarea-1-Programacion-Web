-- =====================================================================================
--  SAMPLE DATA
--  File: src/main/resources/data.sql
--
--  It runs automatically when the application starts (see application.properties:
--  spring.sql.init.mode=always and spring.jpa.defer-datasource-initialization=true).
--
--  IMPORTANT: the ids are written by hand, so at the end the PostgreSQL sequence has to be
--  reset, otherwise the next automatic INSERT would collide with an existing id.
-- =====================================================================================

-- Inserts 3 sample products. "ON CONFLICT DO NOTHING" makes the script idempotent:
-- when the server restarts, the rows are not duplicated.
INSERT INTO products (id, name, description, price) VALUES
    (1, 'Laptop Pro 14"',    'Laptop with 16 GB of RAM, a 512 GB SSD and a Full HD display', 1299.90),
    (2, 'Wireless Mouse',     'Ergonomic mouse with a USB receiver and a rechargeable battery', 25.50),
    (3, 'Mechanical Keyboard', 'RGB keyboard with mechanical switches and a Spanish layout', 89.99)
ON CONFLICT (id) DO NOTHING;

-- Aligns the "products_id_seq" sequence with the current MAX(id) of the table.
-- Without this line, the next automatic INSERT would try to use id 1 and would fail
-- with a "duplicate key value violates unique constraint" error.
SELECT setval(
    pg_get_serial_sequence('products', 'id'),
    GREATEST((SELECT MAX(id) FROM products), 1)
);

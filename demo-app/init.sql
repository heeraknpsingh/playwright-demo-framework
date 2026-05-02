CREATE DATABASE IF NOT EXISTS demo_app;
USE demo_app;

CREATE TABLE IF NOT EXISTS users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(100) NOT NULL UNIQUE,
  password     VARCHAR(100) NOT NULL,
  role         ENUM('admin', 'manager', 'user') NOT NULL,
  display_name VARCHAR(100) NOT NULL
);

INSERT INTO users (username, password, role, display_name) VALUES
  ('admin@demo.local',   'Admin123!',   'admin',   'Alice Admin'),
  ('manager@demo.local', 'Manager123!', 'manager', 'Mike Manager'),
  ('user@demo.local',    'User123!',    'user',    'Uma User')
ON DUPLICATE KEY UPDATE id = id;

# 🗄️ GenBridge SQL & MySQL Database Architecture Guide

This guide details the SQL database design powering **GenBridge**, including both the out-of-the-box **SQLite engine** (zero-setup, built right into Node.js 22.5+) and the production **MySQL / MariaDB schema** (`database/schema.mysql.sql`).

---

## 1. Architectural Philosophy: Dual-Engine Design

GenBridge is designed with a clean SQL abstraction:
1. **Development & Demo (SQLite)**: Runs locally without installing heavy database servers. The file `database/genbridge.sqlite` is automatically created, migrated, and seeded with demo data on the first run.
2. **Production & Enterprise (MySQL 5.7+ / 8.0+ / MariaDB)**: Uses standard relational tables with Foreign Key constraints, InnoDB ACID transactions, and UTF-8 multi-byte encoding (`utf8mb4`).

Both engines share the exact same entity model, column types, and relational constraints.

---

## 2. Relational Schema Blueprint (ERD)

```text
  +------------------+         1 : N         +-------------------+
  |      USERS       | --------------------> |     CAMPAIGNS     |
  +------------------+                       +-------------------+
  | id (PK)          |                       | id (PK)           |
  | name             |                       | promoter_id (FK)  |
  | email (UNIQUE)   |                       | title             |
  | password_hash    |                       | category          |
  | role             |                       | target_amount     |
  | wallet_balance   |                       | raised_amount     |
  | status           |                       | status            |
  +------------------+                       +-------------------+
           |                                           |
           | 1 : N                           1 : N     |
           v                                           v
  +------------------+                       +-------------------+
  |   INVESTMENTS    |                       |    MILESTONES     |
  | (Delivery Orders)|                       +-------------------+
  +------------------+                       | id (PK)           |
  | id (PK)          |                       | campaign_id (FK)  |
  | order_number     |                       | title             |
  | user_id (FK)     |                       | target_percentage |
  | campaign_id (FK) |                       | status            |
  | amount           |                       | proof_note        |
  | platform_fee     |                       +-------------------+
  | mentor_note      |
  | status           |
  +------------------+

  +-----------------------+
  |   PLATFORM_SETTINGS   |
  +-----------------------+
  | setting_key (PK)      |
  | setting_value         |
  | description           |
  +-----------------------+
```

---

## 3. Database Table Definitions

### 3.1 `users` Table
Stores all three platform personas:
- `'user'`: Backer / Investor who orders micro-investments and provides guidance.
- `'promoter'`: Creator, YouTuber, or founder requesting funds.
- `'admin'`: Platform administrator with full alteration rights.

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user', 'promoter', 'admin') NOT NULL DEFAULT 'user',
    bio TEXT,
    avatar VARCHAR(255) DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    status ENUM('active', 'suspended') NOT NULL DEFAULT 'active',
    wallet_balance DECIMAL(12, 2) NOT NULL DEFAULT 5000.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_role (role),
    INDEX idx_user_status (status)
) ENGINE=InnoDB;
```

### 3.2 `campaigns` Table
The "Menu Items" / pitches submitted by promoters:
- Supports categorized filtering: `'YouTube & Creators'`, `'Tech Startups'`, `'Local Business'`, `'Student Prototypes'`.
- Status lifecycle: `'pending'`, `'active'`, `'funded'`, `'paused'`, `'rejected'`. All modifiable by the admin panel.

```sql
CREATE TABLE campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    promoter_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    tagline VARCHAR(300) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description LONGTEXT NOT NULL,
    target_amount DECIMAL(12, 2) NOT NULL,
    raised_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    min_investment DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
    image_url VARCHAR(500),
    video_url VARCHAR(500),
    perks_description TEXT,
    location VARCHAR(150) DEFAULT 'Remote / Online',
    status ENUM('pending', 'active', 'funded', 'paused', 'rejected') NOT NULL DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (promoter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_campaign_status (status),
    INDEX idx_campaign_category (category),
    INDEX idx_campaign_featured (is_featured)
) ENGINE=InnoDB;
```

### 3.3 `investments` Table (The Delivery Order)
Each micro-investment behaves like an on-demand food order:
- Generated with a human-readable tracking number: `GB-90124`.
- Captures cross-generational mentorship notes (`mentor_note`).
- Real-time status pipeline: `placed` $\rightarrow$ `disbursed` $\rightarrow$ `milestone_in_progress` $\rightarrow$ `delivered`.

```sql
CREATE TABLE investments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    campaign_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    mentor_note TEXT,
    status ENUM('placed', 'disbursed', 'milestone_in_progress', 'delivered', 'completed') NOT NULL DEFAULT 'delivered',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    INDEX idx_investment_order (order_number),
    INDEX idx_investment_status (status)
) ENGINE=InnoDB;
```

### 3.4 `milestones` Table
Provides the verification layer for promoters:
- Promoters attach receipts, links, or video evidence to prove capital utilization.

```sql
CREATE TABLE milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    target_percentage INT NOT NULL,
    status ENUM('pending', 'in_progress', 'completed') NOT NULL DEFAULT 'pending',
    proof_url VARCHAR(500),
    proof_note TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

### 3.5 `platform_settings` Table
Key-value store alterable in real-time from the Private Admin Panel without editing code:

```sql
CREATE TABLE platform_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
```

---

## 4. How to Set Up MySQL

### Option A: Local Setup with XAMPP / WampServer (Recommended for Windows)
1. Download and install **XAMPP** from [apachefriends.org](https://www.apachefriends.org/).
2. Open the **XAMPP Control Panel** and click **Start** next to **MySQL**.
3. Open your browser and navigate to `http://localhost/phpmyadmin`.
4. Click the **Import** tab.
5. Click **Choose File** and select `database/schema.mysql.sql` from the GenBridge workspace.
6. Click **Go** at the bottom.
7. Your `genbridge_db` database is now created and seeded!

### Option B: Local Setup with MySQL Command Line / Workbench
Open your terminal (PowerShell or Bash) and execute:
```bash
# Connect to your MySQL server as root
mysql -u root -p

# Inside MySQL prompt, run:
source c:/Users/PIYUSH PRATAP SINGH/Documents/GenBridge/database/schema.mysql.sql;
```
Or import directly:
```bash
mysql -u root -p < database/schema.mysql.sql
```

### Option C: Running MySQL with Docker
You can spin up an isolated MySQL 8 instance with a single command:
```bash
docker run --name genbridge-mysql \
  -e MYSQL_ROOT_PASSWORD=secret \
  -e MYSQL_DATABASE=genbridge_db \
  -p 3306:3306 \
  -d mysql:8.0
```
Then import the schema:
```bash
docker exec -i genbridge-mysql mysql -uroot -psecret genbridge_db < database/schema.mysql.sql
```

### Option D: Free Cloud MySQL (Railway / Aiven / PlanetScale)
1. Create a free account at [Railway.app](https://railway.app) or [Aiven.io](https://aiven.io).
2. Create a new **MySQL** service.
3. Copy the connection string / credentials:
   - `MYSQL_HOST`
   - `MYSQL_PORT` (default 3306)
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`
4. Connect using MySQL Workbench or DBeaver and execute `database/schema.mysql.sql`.

---

## 5. Connecting Node.js to MySQL

To switch the backend from SQLite to MySQL, simply configure environment variables:

```bash
# In your .env or shell:
DB_CLIENT=mysql
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=genbridge_db
```

### MySQL Connection Snippet (`database/mysql-connection.js`)
```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'genbridge_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
```

---

## 6. Useful SQL Administrative Queries

### View Platform Commission Revenue
```sql
SELECT 
    COUNT(*) AS total_orders,
    CONCAT('$', FORMAT(SUM(amount), 2)) AS gross_volume,
    CONCAT('$', FORMAT(SUM(platform_fee), 2)) AS platform_net_revenue
FROM investments;
```

### Top Funded Campaigns
```sql
SELECT 
    c.title,
    u.name AS promoter,
    c.category,
    CONCAT('$', FORMAT(c.raised_amount, 2)) AS raised,
    CONCAT('$', FORMAT(c.target_amount, 2)) AS goal,
    ROUND((c.raised_amount / c.target_amount) * 100, 1) AS percent_funded
FROM campaigns c
JOIN users u ON c.promoter_id = u.id
ORDER BY c.raised_amount DESC;
```

### Recent Cross-Generational Mentorship Advice
```sql
SELECT 
    i.order_number,
    u.name AS backer,
    c.title AS idea,
    i.mentor_note,
    i.created_at
FROM investments i
JOIN users u ON i.user_id = u.id
JOIN campaigns c ON i.campaign_id = c.id
WHERE i.mentor_note IS NOT NULL AND i.mentor_note != ''
ORDER BY i.created_at DESC;
```

-- ========================================================
-- PitchFund - MySQL Database Schema & Initial Data
-- Description: Micro-Investments & Idea Funding Platform
-- Supports: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- ========================================================

CREATE DATABASE IF NOT EXISTS pitchfund_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pitchfund_db;

-- 1. Table: users (Investors, Promoters, Admin)
DROP TABLE IF EXISTS investments;
DROP TABLE IF EXISTS milestones;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS platform_settings;
DROP TABLE IF EXISTS users;

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

-- 2. Table: campaigns (Pitches, Startups, YouTube gear requests)
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

-- 3. Table: investments (Micro-investment "orders" with delivery tracking)
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

-- 4. Table: milestones (Progress tracking, receipts, proof-of-work)
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

-- 5. Table: platform_settings (Global configurable options managed by Admin)
CREATE TABLE platform_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ========================================================
-- Seed Initial Settings
-- ========================================================
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('platform_name', 'PitchFund', 'Official branding title for the platform'),
('platform_commission_percent', '5.0', 'Platform fee percentage charged on micro-investments'),
('min_investment_global', '10.00', 'Minimum allowable micro-investment across any campaign'),
('currency_symbol', '$', 'Currency symbol used throughout the interface'),
('allow_new_registrations', 'true', 'System flag to enable or pause public signups'),
('announcement_banner', '🚀 Welcome to PitchFund: Connecting experienced wisdom & capital with the next generation of creators!', 'Top banner alert message');

-- ========================================================
-- Seed Initial Demo Users (Pass: admin123, promoter123, user123)
-- ========================================================
INSERT INTO users (id, name, email, password_hash, role, bio, wallet_balance) VALUES
(1, 'System Administrator', 'admin@pitchfund.org', 'b9b21f3f619b015e3b2e51965a388a10:486a44c7b88950d4f29ee87f5e3bf32ca181cb239e3f61ec885c4900a68d0bb56114eb3a48e7150c2668fc723f508d6bcba71a0ea4a36f73449339e80277df60', 'admin', 'Superadmin overseeing PitchFund ecosystem governance, compliance & approvals.', 10000.00),
(2, 'Alex Rivera', 'alex@creator.com', 'b9b21f3f619b015e3b2e51965a388a10:486a44c7b88950d4f29ee87f5e3bf32ca181cb239e3f61ec885c4900a68d0bb56114eb3a48e7150c2668fc723f508d6bcba71a0ea4a36f73449339e80277df60', 'promoter', 'Tech YouTuber & Edu-Creator building a deep-dive hardware breakdown studio.', 250.00),
(3, 'Sarah Chen', 'sarah@bioblend.co', 'b9b21f3f619b015e3b2e51965a388a10:486a44c7b88950d4f29ee87f5e3bf32ca181cb239e3f61ec885c4900a68d0bb56114eb3a48e7150c2668fc723f508d6bcba71a0ea4a36f73449339e80277df60', 'promoter', '22-year-old material science grad creating 100% biodegradable bamboo chai cups.', 120.00),
(4, 'Robert Montgomery', 'robert@investor.com', 'b9b21f3f619b015e3b2e51965a388a10:486a44c7b88950d4f29ee87f5e3bf32ca181cb239e3f61ec885c4900a68d0bb56114eb3a48e7150c2668fc723f508d6bcba71a0ea4a36f73449339e80277df60', 'user', 'Retired Telecom VP passionate about mentoring Gen-Z tech creators & local green businesses.', 4200.00);

-- ========================================================
-- Seed Initial Campaigns
-- ========================================================
INSERT INTO campaigns (id, promoter_id, title, tagline, category, description, target_amount, raised_amount, min_investment, image_url, video_url, perks_description, location, status, is_featured) VALUES
(1, 2, 'NextGen Studio: 4K Cinema Rig & Audio Lab', 'Upgrading educational tech teardown channel from phone video to studio-grade cinema gear.', 'YouTube & Creators', 'I have built a 45K subscriber audience explaining semiconductor chips and gadgets. Currently recording on a 4-year-old smartphone. Need funding to purchase a Sony FX3 cinema setup, directional boom mics, and color-accurate monitors to produce documentary-tier engineering content.', 3500.00, 2450.00, 25.00, 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80', 'https://youtube.com/watch?v=sample1', 'Supporters get special in-video credits, early cut preview link, and exclusive monthly Q&A mentoring hangout.', 'Austin, TX (Global Online)', 'active', 1),
(2, 3, 'BioChai: 100% Plant-Based Biodegradable Cups', 'Eliminating single-use plastic lined cups across campus cafes and street kiosks.', 'Local Business', 'Over 10,000 plastic-coated paper cups are thrown into campus landfill weekly. BioChai manufactures lightweight, leakproof cups made from agri-waste stalks and bamboo fiber that break down into organic compost in 45 days. Seeking capital for our first commercial mold casting machine.', 5000.00, 3800.00, 20.00, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80', 'https://youtube.com/watch?v=sample2', 'Backers receive a sampler pack of cups, custom branded thermos flask, and 3% profit share coupon.', 'Seattle, WA', 'active', 1),
(3, 2, 'CareNest: Voice-Activated Senior Companion', 'Simple voice companion bridging grandkids and grandparents with automated voice journaling.', 'Tech Startups', 'Many seniors feel disconnected from their tech-savvy grandkids. CareNest is a single-button desktop companion device that turns voice messages from family into natural conversational prompts, notifying families of daily wellness.', 8000.00, 4200.00, 50.00, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80', 'https://youtube.com/watch?v=sample3', 'Device unit from batch #1, listed as founding advisory backer in companion app credits.', 'San Francisco, CA', 'active', 1);

-- ========================================================
-- Seed Initial Milestones
-- ========================================================
INSERT INTO milestones (campaign_id, title, description, target_percentage, status, proof_url, proof_note) VALUES
(1, 'Audio Studio Acoustic Treatment', 'Install sound panels and condenser mic boom', 25, 'completed', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80', 'Installed 12 acoustic diffusers in the home studio! Noise floor dropped by 18dB.'),
(1, 'Sony FX3 Cinema Camera Body Purchase', 'Procure 4K 120fps camera body and cage', 60, 'completed', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80', 'Ordered from B&H Photo with warranty; invoice #BH-98218 verified.'),
(1, 'First 4K Documentary Episode Release', 'Produce full-length episode on how microchips are fabricated', 100, 'in_progress', NULL, 'Scripting finished. Shooting scheduled for next Tuesday.');

-- ========================================================
-- Seed Initial Investments
-- ========================================================
INSERT INTO investments (order_number, user_id, campaign_id, amount, platform_fee, mentor_note, status) VALUES
('GB-10492', 4, 1, 500.00, 25.00, 'Alex, great channel! Having managed engineering teams at Lucent, I love seeing young educators make hardware approachable. Make sure to invest in backup audio recorders!', 'delivered'),
('GB-10493', 4, 2, 300.00, 15.00, 'Sarah, brilliant initiative. I have contacts in packaging logistics if you ever need advice on regional distribution.', 'delivered');

const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

// Serverless detection (Vercel, AWS Lambda, Netlify)
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NETLIFY
);

// In serverless environments, the source root (/var/task) is read-only.
// We must place writable SQLite databases in os.tmpdir() (/tmp).
let DB_PATH;
if (process.env.DATABASE_PATH) {
  DB_PATH = process.env.DATABASE_PATH;
} else if (isServerless) {
  DB_PATH = path.join(os.tmpdir(), 'pitchfund.sqlite');
  const sourceDb = path.join(__dirname, 'pitchfund.sqlite');
  const legacyDb = path.join(__dirname, 'genbridge.sqlite');
  if (!fs.existsSync(DB_PATH)) {
    try {
      if (fs.existsSync(sourceDb)) {
        fs.copyFileSync(sourceDb, DB_PATH);
      } else if (fs.existsSync(legacyDb)) {
        fs.copyFileSync(legacyDb, DB_PATH);
      }
    } catch (_) {}
  }
} else {
  DB_PATH = path.join(__dirname, 'pitchfund.sqlite');
  const legacyDb = path.join(__dirname, 'genbridge.sqlite');
  if (!fs.existsSync(DB_PATH) && fs.existsSync(legacyDb)) {
    try {
      fs.copyFileSync(legacyDb, DB_PATH);
    } catch (_) {}
  }
}

const db = new DatabaseSync(DB_PATH);

// Password hashing helpers with scrypt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'utf8'), Buffer.from(originalHash, 'utf8'));
}

// Initialize tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user', -- 'user' (investor), 'promoter' (creator), 'admin'
      bio TEXT,
      avatar TEXT DEFAULT 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended'
      wallet_balance REAL NOT NULL DEFAULT 5000.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      promoter_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      tagline TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      target_amount REAL NOT NULL,
      raised_amount REAL NOT NULL DEFAULT 0.00,
      min_investment REAL NOT NULL DEFAULT 10.00,
      image_url TEXT,
      video_url TEXT,
      perks_description TEXT,
      location TEXT DEFAULT 'Remote / Online',
      status TEXT NOT NULL DEFAULT 'active', -- 'pending', 'active', 'funded', 'paused', 'rejected'
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (promoter_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS investments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      platform_fee REAL NOT NULL DEFAULT 0.00,
      mentor_note TEXT,
      status TEXT NOT NULL DEFAULT 'delivered', -- 'placed', 'disbursed', 'milestone_in_progress', 'delivered', 'completed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_percentage INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
      proof_url TEXT,
      proof_note TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default platform settings if not present
  const existingSettings = db.prepare('SELECT COUNT(*) as count FROM platform_settings').get();
  if (!existingSettings || existingSettings.count === 0) {
    const insertSetting = db.prepare('INSERT INTO platform_settings (setting_key, setting_value, description) VALUES (?, ?, ?)');
    insertSetting.run('platform_name', 'PitchFund', 'Official branding title for the platform');
    insertSetting.run('platform_commission_percent', '5.0', 'Platform fee percentage charged on micro-investments');
    insertSetting.run('min_investment_global', '10.00', 'Minimum allowable micro-investment across any campaign');
    insertSetting.run('currency_symbol', '$', 'Currency symbol used throughout the interface');
    insertSetting.run('allow_new_registrations', 'true', 'System flag to enable or pause public signups');
    insertSetting.run('announcement_banner', '🚀 Welcome to PitchFund: Connecting experienced capital & wisdom with the next generation of creators!', 'Top banner alert message');
  } else {
    // Migrate legacy settings to PitchFund
    try {
      db.prepare("UPDATE platform_settings SET setting_value = 'PitchFund' WHERE setting_key = 'platform_name' AND setting_value = 'GenBridge'").run();
      db.prepare("UPDATE platform_settings SET setting_value = '🚀 Welcome to PitchFund: Connecting experienced capital & wisdom with the next generation of creators!' WHERE setting_key = 'announcement_banner' AND setting_value LIKE '%GenBridge%'").run();
    } catch (_) {}
  }

  // Seed default users if empty
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!existingUsers || existingUsers.count === 0) {
    const defaultPassword = hashPassword('admin123');
    const promoterPassword = hashPassword('promoter123');
    const userPassword = hashPassword('user123');

    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, bio, wallet_balance, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'System Administrator',
      'admin@pitchfund.org',
      defaultPassword,
      'admin',
      'Superadmin overseeing PitchFund ecosystem governance, compliance, and platform alterations.',
      10000.00,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    );

    insertUser.run(
      'Alex Rivera',
      'alex@creator.com',
      promoterPassword,
      'promoter',
      'Tech YouTuber & Edu-Creator building a deep-dive hardware breakdown studio.',
      350.00,
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80'
    );

    insertUser.run(
      'Sarah Chen',
      'sarah@bioblend.co',
      promoterPassword,
      'promoter',
      '22-year-old material science grad creating 100% biodegradable bamboo chai cups.',
      220.00,
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80'
    );

    insertUser.run(
      'Robert Montgomery',
      'robert@investor.com',
      userPassword,
      'user',
      'Retired Telecom VP passionate about mentoring Gen-Z tech creators & local green businesses.',
      4500.00,
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
    );

    // Seed campaigns
    const insertCampaign = db.prepare(`
      INSERT INTO campaigns (promoter_id, title, tagline, category, description, target_amount, raised_amount, min_investment, image_url, video_url, perks_description, location, status, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertCampaign.run(
      2,
      'NextGen Studio: 4K Cinema Rig & Audio Lab',
      'Upgrading educational tech teardown YouTube channel from phone video to studio-grade cinema gear.',
      'YouTube & Creators',
      'I run a fast-growing 45K subscriber YouTube channel dedicated to breaking down electronics, microchips, and robotics. Recording on an aging phone limits visual clarity. We are raising funds for a Sony FX3 cinema setup, macro lenses, and pro audio monitors. Backers will be directly credited and invited to private monthly project consultations.',
      3500.00,
      2450.00,
      25.00,
      'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80',
      'https://youtube.com/watch?v=sample1',
      'Supporters get in-video producer credits, raw unreleased cuts, and private Discord community access.',
      'Austin, TX (Global Stream)',
      'active',
      1
    );

    insertCampaign.run(
      3,
      'BioChai: 100% Biodegradable Stalk Fiber Cups',
      'Replacing toxic plastic-lined single-use cups in universities and coffee carts.',
      'Local Business',
      'BioChai produces heat-resistant, zero-plastic cups crafted from upcycled wheat straw and bamboo cellulose. They decompose naturally within 45 days in normal soil. We need capital to commission our first continuous thermal compression mold.',
      5000.00,
      3800.00,
      20.00,
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=80',
      'https://youtube.com/watch?v=sample2',
      'Backers receive a 25-pack collector box, custom laser-etched tumbler, and 5% revenue voucher.',
      'Seattle, WA',
      'active',
      1
    );

    insertCampaign.run(
      2,
      'CareNest: AI Voice Journal for Seniors & Grandkids',
      'A simple tactile bedside box bridging generational distance through voice stories.',
      'Tech Startups',
      'CareNest is a smart ambient speaker designed specifically for older family members who find touchscreens frustrating. It prompts gentle memories, transcribes oral histories, and sends voice postcards directly to grandchildrens phones.',
      8000.00,
      4350.00,
      50.00,
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
      'https://youtube.com/watch?v=sample3',
      'Production unit from Batch #001, printed memorial family plaque, lifetime cloud sync.',
      'San Francisco, CA',
      'active',
      1
    );

    // Seed Milestones for campaign 1
    const insertMilestone = db.prepare(`
      INSERT INTO milestones (campaign_id, title, description, target_percentage, status, proof_url, proof_note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertMilestone.run(
      1,
      'Acoustic Lab Treatment',
      'Install studio grade sound absorption tiles & boom arm',
      25,
      'completed',
      'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80',
      '12 rockwool panels installed. Noise floor lowered by 16dB. Verified sound test uploaded.'
    );

    insertMilestone.run(
      1,
      'Sony Cinema Camera Procurement',
      'Procure Sony FX3 with cage and dual XLR inputs',
      60,
      'completed',
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80',
      'Purchased from authorized dealer with 3-year warranty. Invoice #BH-98218 stored.'
    );

    insertMilestone.run(
      1,
      'Release Teardown Documentary on Quantum Chips',
      'Full 4K production release with interactive schematic companion',
      100,
      'in_progress',
      null,
      'Principal video shoot is wrapped. Currently sound editing and color grading.'
    );

    // Seed Initial Investments
    const insertInv = db.prepare(`
      INSERT INTO investments (order_number, user_id, campaign_id, amount, platform_fee, mentor_note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertInv.run(
      'GB-90124',
      4,
      1,
      500.00,
      25.00,
      'Alex, fantastic vision. Having spent 30 years in engineering leadership, clear communication is rare. Keep your explanations jargon-free!',
      'delivered'
    );

    insertInv.run(
      'GB-90125',
      4,
      2,
      350.00,
      17.50,
      'Sarah, eco-packaging is urgent. Make sure your patents on the resin blend are filed before expanding distribution.',
      'delivered'
    );
  }

  // Ensure completed campaigns exist for Discover page
  const completedCamps = db.prepare("SELECT COUNT(*) as count FROM campaigns WHERE status = 'funded'").get();
  if (!completedCamps || completedCamps.count === 0) {
    const insertCompleted = db.prepare(`
      INSERT INTO campaigns (promoter_id, title, tagline, category, description, target_amount, raised_amount, min_investment, image_url, video_url, perks_description, location, status, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const camp4Info = insertCompleted.run(
      3,
      'EcoPrint 3D: Recycled Ocean Plastic Filament',
      'Successfully built low-cost desktop plastic pellet extruder for university makerspaces.',
      'Student Prototypes',
      'We designed an open-hardware screw extruder that turns shredded HDPE milk jugs and ocean plastic into premium 1.75mm 3D printing filament. Funding goal reached and all units delivered to 14 college maker labs!',
      2500.00,
      2650.00,
      20.00,
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      'https://youtube.com/watch?v=sample4',
      'Backers received 1kg test spools and open-source CAD schematics.',
      'Bhopal, MP (IIIT Bhopal Incubator)',
      'funded',
      0
    );

    const camp5Info = insertCompleted.run(
      2,
      'CodeRural: Solar STEM Kits for Rural Classrooms',
      'Equipped 20 rural village classrooms with solar-powered Raspberry Pi computers.',
      'Local Business',
      'Bridged the digital divide by building ruggedized, solar-battery powered micro-computers with offline Wikipedia, Scratch, and Python tutorials. All 20 school installations completed and verified by local educational officers.',
      4000.00,
      4120.00,
      25.00,
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
      'https://youtube.com/watch?v=sample5',
      'Personalized handwritten thank-you letters from students and quarterly impact report.',
      'Madhya Pradesh, India',
      'funded',
      0
    );

    // Seed completed milestones for verification
    const insertMilestone = db.prepare(`
      INSERT INTO milestones (campaign_id, title, description, target_percentage, status, proof_url, proof_note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertMilestone.run(camp4Info.lastInsertRowid, 'Extruder Hardware Assembly', 'CNC machined barrel & heating block assembled', 50, 'completed', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', 'Extruder precision tolerance verified under 0.02mm.');
    insertMilestone.run(camp4Info.lastInsertRowid, 'Filament Quality & Spool Delivery', 'Shipped 15 spools to lab backers', 100, 'completed', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80', 'All 15 spools delivered with tracking numbers.');

    insertMilestone.run(camp5Info.lastInsertRowid, 'Solar Micro-Computer Kits Procured', 'Batch of 20 Raspberry Pi kits with solar panels', 50, 'completed', null, 'Government school authorization receipt #MP-EDU-981.');
    insertMilestone.run(camp5Info.lastInsertRowid, 'Classroom Deployment & Student Training', 'Installed across 20 remote schools in MP', 100, 'completed', null, 'Impact audit confirmed: 850 students now learning programming offline.');
  }

  // Ensure admin@pitchfund.org is present in users
  try {
    const adminCheck = db.prepare("SELECT * FROM users WHERE email = 'admin@pitchfund.org'").get();
    if (!adminCheck) {
      const defaultPassword = hashPassword('admin123');
      db.prepare(`
        INSERT OR IGNORE INTO users (name, email, password_hash, role, bio, wallet_balance, avatar)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'System Administrator',
        'admin@pitchfund.org',
        defaultPassword,
        'admin',
        'Superadmin overseeing PitchFund ecosystem governance, compliance, and platform alterations.',
        10000.00,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
      );
    }
  } catch (_) {}
}

// Ensure database is initialized
initDatabase();

module.exports = {
  db,
  hashPassword,
  verifyPassword,

  // Settings
  getSettings() {
    const rows = db.prepare('SELECT setting_key, setting_value, description FROM platform_settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.setting_key] = row.setting_value;
    }
    return settings;
  },

  getAllSettingsList() {
    return db.prepare('SELECT * FROM platform_settings ORDER BY setting_key ASC').all();
  },

  updateSetting(key, value) {
    const stmt = db.prepare(`
      INSERT INTO platform_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(key, value);
  },

  // Users
  getUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
  },

  getUserById(id) {
    const user = db.prepare('SELECT id, name, email, role, bio, avatar, status, wallet_balance, created_at FROM users WHERE id = ?').get(id);
    return user;
  },

  createUser({ name, email, password, role = 'user', bio = '' }) {
    const passwordHash = hashPassword(password);
    const balance = role === 'user' ? 5000.00 : 250.00;
    const stmt = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, bio, wallet_balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, email, passwordHash, role, bio, balance);
    return this.getUserById(info.lastInsertRowid);
  },

  getAllUsers() {
    return db.prepare(`
      SELECT id, name, email, role, bio, avatar, status, wallet_balance, created_at,
             (SELECT COUNT(*) FROM investments WHERE user_id = users.id) as investments_count,
             (SELECT COUNT(*) FROM campaigns WHERE promoter_id = users.id) as campaigns_count
      FROM users ORDER BY id DESC
    `).all();
  },

  updateUser(id, updates) {
    const fields = [];
    const values = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.role !== undefined) { fields.push('role = ?'); values.push(updates.role); }
    if (updates.bio !== undefined) { fields.push('bio = ?'); values.push(updates.bio); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.wallet_balance !== undefined) { fields.push('wallet_balance = ?'); values.push(parseFloat(updates.wallet_balance)); }
    if (updates.password) {
      fields.push('password_hash = ?');
      values.push(hashPassword(updates.password));
    }

    if (fields.length === 0) return null;
    values.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.prepare(sql).run(...values);
    return this.getUserById(id);
  },

  deleteUser(id) {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
  },

  // Campaigns
  getCampaigns({ category, search, status, featured, promoterId } = {}) {
    let sql = `
      SELECT c.*, u.name as promoter_name, u.avatar as promoter_avatar, u.bio as promoter_bio,
             (SELECT COUNT(*) FROM investments WHERE campaign_id = c.id) as backers_count,
             ROUND((c.raised_amount / c.target_amount) * 100, 1) as progress_percentage
      FROM campaigns c
      JOIN users u ON c.promoter_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }
    if (category && category !== 'All') {
      sql += ' AND c.category = ?';
      params.push(category);
    }
    if (featured !== undefined) {
      sql += ' AND c.is_featured = ?';
      params.push(featured ? 1 : 0);
    }
    if (promoterId) {
      sql += ' AND c.promoter_id = ?';
      params.push(promoterId);
    }
    if (search) {
      sql += ' AND (c.title LIKE ? OR c.tagline LIKE ? OR c.description LIKE ? OR c.category LIKE ?)';
      const queryParam = `%${search}%`;
      params.push(queryParam, queryParam, queryParam, queryParam);
    }

    sql += ' ORDER BY c.is_featured DESC, c.id DESC';
    return db.prepare(sql).all(...params);
  },

  getCampaignById(id) {
    const campaign = db.prepare(`
      SELECT c.*, u.name as promoter_name, u.email as promoter_email, u.avatar as promoter_avatar, u.bio as promoter_bio,
             (SELECT COUNT(*) FROM investments WHERE campaign_id = c.id) as backers_count,
             ROUND((c.raised_amount / c.target_amount) * 100, 1) as progress_percentage
      FROM campaigns c
      JOIN users u ON c.promoter_id = u.id
      WHERE c.id = ?
    `).get(id);

    if (!campaign) return null;

    campaign.milestones = db.prepare(`
      SELECT * FROM milestones WHERE campaign_id = ? ORDER BY target_percentage ASC
    `).all(id);

    campaign.recent_backers = db.prepare(`
      SELECT i.id, i.order_number, i.amount, i.mentor_note, i.created_at, u.name as user_name, u.avatar as user_avatar
      FROM investments i
      JOIN users u ON i.user_id = u.id
      WHERE i.campaign_id = ?
      ORDER BY i.id DESC
      LIMIT 10
    `).all(id);

    return campaign;
  },

  createCampaign(data) {
    const stmt = db.prepare(`
      INSERT INTO campaigns (promoter_id, title, tagline, category, description, target_amount, min_investment, image_url, video_url, perks_description, location, status, is_featured)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      data.promoter_id,
      data.title,
      data.tagline || '',
      data.category,
      data.description,
      parseFloat(data.target_amount),
      parseFloat(data.min_investment || 10.0),
      data.image_url || 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80',
      data.video_url || '',
      data.perks_description || '',
      data.location || 'Remote / Online',
      data.status || 'active',
      data.is_featured ? 1 : 0
    );

    const campaignId = info.lastInsertRowid;

    // Create default milestones for new campaign
    const insertMilestone = db.prepare(`
      INSERT INTO milestones (campaign_id, title, description, target_percentage, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertMilestone.run(campaignId, 'Phase 1: Setup & Gear Procurement', 'Purchase required supplies or hardware', 25, 'pending');
    insertMilestone.run(campaignId, 'Phase 2: Alpha Prototype / Pilot Content', 'Initial deployment or pilot recording', 50, 'pending');
    insertMilestone.run(campaignId, 'Phase 3: Public Launch & Backer Perks Delivery', 'Official launch and distribution of returns/rewards', 100, 'pending');

    return this.getCampaignById(campaignId);
  },

  updateCampaign(id, updates) {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.tagline !== undefined) { fields.push('tagline = ?'); values.push(updates.tagline); }
    if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.target_amount !== undefined) { fields.push('target_amount = ?'); values.push(parseFloat(updates.target_amount)); }
    if (updates.min_investment !== undefined) { fields.push('min_investment = ?'); values.push(parseFloat(updates.min_investment)); }
    if (updates.image_url !== undefined) { fields.push('image_url = ?'); values.push(updates.image_url); }
    if (updates.video_url !== undefined) { fields.push('video_url = ?'); values.push(updates.video_url); }
    if (updates.perks_description !== undefined) { fields.push('perks_description = ?'); values.push(updates.perks_description); }
    if (updates.location !== undefined) { fields.push('location = ?'); values.push(updates.location); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.is_featured !== undefined) { fields.push('is_featured = ?'); values.push(updates.is_featured ? 1 : 0); }

    if (fields.length === 0) return this.getCampaignById(id);
    values.push(id);

    const sql = `UPDATE campaigns SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    db.prepare(sql).run(...values);
    return this.getCampaignById(id);
  },

  deleteCampaign(id) {
    return db.prepare('DELETE FROM campaigns WHERE id = ?').run(id);
  },

  // Investments / Orders
  createInvestment({ userId, campaignId, amount, mentorNote }) {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.wallet_balance < amount) throw new Error('Insufficient wallet balance');

    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const settings = this.getSettings();
    const commissionPercent = parseFloat(settings.platform_commission_percent || '5.0');
    const platformFee = (amount * commissionPercent) / 100;
    const promoterAmount = amount - platformFee;

    const orderNumber = `GB-${Math.floor(10000 + Math.random() * 90000)}`;

    // Atomic transaction steps
    db.prepare('UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?').run(amount, userId);
    db.prepare('UPDATE users SET wallet_balance = wallet_balance + ? WHERE id = ?').run(promoterAmount, campaign.promoter_id);
    db.prepare('UPDATE campaigns SET raised_amount = raised_amount + ? WHERE id = ?').run(amount, campaignId);

    const stmt = db.prepare(`
      INSERT INTO investments (order_number, user_id, campaign_id, amount, platform_fee, mentor_note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(orderNumber, userId, campaignId, amount, platformFee, mentorNote || '', 'delivered');

    return db.prepare(`
      SELECT i.*, c.title as campaign_title, c.category, c.image_url as campaign_image,
             u.name as user_name, p.name as promoter_name
      FROM investments i
      JOIN campaigns c ON i.campaign_id = c.id
      JOIN users u ON i.user_id = u.id
      JOIN users p ON c.promoter_id = p.id
      WHERE i.id = ?
    `).get(info.lastInsertRowid);
  },

  getUserInvestments(userId) {
    return db.prepare(`
      SELECT i.*, c.title as campaign_title, c.category, c.image_url as campaign_image,
             c.raised_amount, c.target_amount, p.name as promoter_name
      FROM investments i
      JOIN campaigns c ON i.campaign_id = c.id
      JOIN users p ON c.promoter_id = p.id
      WHERE i.user_id = ?
      ORDER BY i.id DESC
    `).all(userId);
  },

  getAllInvestments() {
    return db.prepare(`
      SELECT i.*, c.title as campaign_title, c.category,
             u.name as investor_name, u.email as investor_email,
             p.name as promoter_name
      FROM investments i
      JOIN campaigns c ON i.campaign_id = c.id
      JOIN users u ON i.user_id = u.id
      JOIN users p ON c.promoter_id = p.id
      ORDER BY i.id DESC
    `).all();
  },

  updateInvestmentStatus(id, status) {
    db.prepare('UPDATE investments SET status = ? WHERE id = ?').run(status, id);
    return db.prepare('SELECT * FROM investments WHERE id = ?').get(id);
  },

  // Milestones
  getMilestones(campaignId) {
    return db.prepare('SELECT * FROM milestones WHERE campaign_id = ? ORDER BY target_percentage ASC').all(campaignId);
  },

  createMilestone({ campaignId, title, description, targetPercentage, proofUrl, proofNote, status = 'pending' }) {
    const stmt = db.prepare(`
      INSERT INTO milestones (campaign_id, title, description, target_percentage, status, proof_url, proof_note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(campaignId, title, description, targetPercentage, status, proofUrl || null, proofNote || null);
    return db.prepare('SELECT * FROM milestones WHERE id = ?').get(info.lastInsertRowid);
  },

  updateMilestone(id, updates) {
    const fields = [];
    const values = [];
    if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.target_percentage !== undefined) { fields.push('target_percentage = ?'); values.push(updates.target_percentage); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.proof_url !== undefined) { fields.push('proof_url = ?'); values.push(updates.proof_url); }
    if (updates.proof_note !== undefined) { fields.push('proof_note = ?'); values.push(updates.proof_note); }

    if (fields.length === 0) return null;
    values.push(id);

    db.prepare(`UPDATE milestones SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values);
    return db.prepare('SELECT * FROM milestones WHERE id = ?').get(id);
  },

  // Platform Metrics
  getPlatformStats() {
    const totals = db.prepare(`
      SELECT
        COUNT(*) as total_investments,
        COALESCE(SUM(amount), 0) as total_volume,
        COALESCE(SUM(platform_fee), 0) as total_platform_revenue
      FROM investments
    `).get();

    const campaignCounts = db.prepare(`
      SELECT
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_campaigns,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_campaigns,
        SUM(CASE WHEN status = 'funded' THEN 1 ELSE 0 END) as funded_campaigns
      FROM campaigns
    `).get();

    const userCounts = db.prepare(`
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as investors_count,
        SUM(CASE WHEN role = 'promoter' THEN 1 ELSE 0 END) as promoters_count,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins_count
      FROM users
    `).get();

    return {
      totalInvestments: totals.total_investments,
      totalVolume: totals.total_volume,
      totalPlatformRevenue: totals.total_platform_revenue,
      totalCampaigns: campaignCounts.total_campaigns,
      activeCampaigns: campaignCounts.active_campaigns || 0,
      pendingCampaigns: campaignCounts.pending_campaigns || 0,
      fundedCampaigns: campaignCounts.funded_campaigns || 0,
      totalUsers: userCounts.total_users,
      investorsCount: userCounts.investors_count || 0,
      promotersCount: userCounts.promoters_count || 0,
      adminsCount: userCounts.admins_count || 0
    };
  }
};

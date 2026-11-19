const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const db = require('./database/db.js');

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'genbridge_super_secure_secret_token_2026';
const PUBLIC_DIR = path.join(__dirname, 'public');

// Simple secure HMAC token generator & verifier
function createToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    // Check if body was already parsed by Vercel serverless runtime or middleware
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body));
      } catch (_) {
        return resolve({});
      }
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Response helpers
function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function errorResponse(res, statusCode, message) {
  jsonResponse(res, statusCode, { error: message });
}

// Extract auth token
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  if (!payload || !payload.id) return null;
  return db.getUserById(payload.id);
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Serve static files
function serveStaticFile(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;

  // Direct access to GenBridge.jpg from root
  if (relativePath === '/GenBridge.jpg') {
    const rootLogo = path.join(__dirname, 'GenBridge.jpg');
    if (fs.existsSync(rootLogo)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      fs.createReadStream(rootLogo).pipe(res);
      return;
    }
  }

  let filePath = path.join(PUBLIC_DIR, relativePath);

  // Security check against directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return errorResponse(res, 403, 'Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback for SPA routing
      const indexHtml = path.join(PUBLIC_DIR, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(indexHtml).pipe(res);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

// Request handler function (shared between standalone HTTP server and Vercel Serverless Function)
async function handleRequest(req, res) {
  // Safe URL parsing supporting Vercel x-matched-path rewrites
  const rawPath = req.headers['x-matched-path'] || req.url || '/';
  let urlObj;
  try {
    urlObj = new URL(rawPath, `http://${req.headers.host || 'localhost'}`);
  } catch (_) {
    urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  }

  let pathname = urlObj.pathname;
  // If invoked via /api or /api/index.js rewrite, check x-matched-path or fallback to req.url
  if ((pathname === '/api' || pathname === '/api/' || pathname === '/api/index.js') && req.headers['x-matched-path']) {
    try {
      pathname = new URL(req.headers['x-matched-path'], 'http://localhost').pathname;
    } catch (_) {}
  }

  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // --- API Routes ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Health & Settings
      if (pathname === '/api/health' && method === 'GET') {
        return jsonResponse(res, 200, { status: 'healthy', timestamp: new Date().toISOString() });
      }

      if (pathname === '/api/settings' && method === 'GET') {
        return jsonResponse(res, 200, db.getSettings());
      }

      // 2. Authentication
      if (pathname === '/api/auth/register' && method === 'POST') {
        const body = await parseBody(req);
        const { name, email, password, role, bio } = body;

        if (!name || !email || !password) {
          return errorResponse(res, 400, 'Name, email, and password are required');
        }

        const validRole = role === 'promoter' ? 'promoter' : 'user';
        const existing = db.getUserByEmail(email);
        if (existing) {
          return errorResponse(res, 409, 'An account with this email already exists');
        }

        const user = db.createUser({ name, email, password, role: validRole, bio });
        const token = createToken({ id: user.id, email: user.email, role: user.role });
        return jsonResponse(res, 201, { user, token });
      }

      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return errorResponse(res, 400, 'Email and password are required');
        }

        const user = db.getUserByEmail(email);
        if (!user || !db.verifyPassword(password, user.password_hash)) {
          return errorResponse(res, 401, 'Invalid email or password credentials');
        }

        if (user.status === 'suspended') {
          return errorResponse(res, 403, 'Your account has been suspended by administration');
        }

        const token = createToken({ id: user.id, email: user.email, role: user.role });
        const safeUser = db.getUserById(user.id);
        return jsonResponse(res, 200, { user: safeUser, token });
      }

      if (pathname === '/api/auth/me' && method === 'GET') {
        const user = getAuthUser(req);
        if (!user) return errorResponse(res, 401, 'Unauthorized');
        return jsonResponse(res, 200, { user });
      }

      // 3. Campaigns Public & Promoter Routes
      if (pathname === '/api/campaigns' && method === 'GET') {
        const category = urlObj.searchParams.get('category');
        const search = urlObj.searchParams.get('search');
        const statusParam = urlObj.searchParams.get('status');
        const status = (statusParam === 'all' || statusParam === '') ? null : (statusParam || null);
        const featured = urlObj.searchParams.get('featured') ? true : undefined;
        const promoterId = urlObj.searchParams.get('promoterId');

        const campaigns = db.getCampaigns({ category, search, status, featured, promoterId });
        return jsonResponse(res, 200, campaigns);
      }

      const campaignIdMatch = pathname.match(/^\/api\/campaigns\/(\d+)$/);
      if (campaignIdMatch && method === 'GET') {
        const campaign = db.getCampaignById(parseInt(campaignIdMatch[1], 10));
        if (!campaign) return errorResponse(res, 404, 'Campaign not found');
        return jsonResponse(res, 200, campaign);
      }

      if (pathname === '/api/campaigns' && method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return errorResponse(res, 401, 'Unauthorized');
        if (user.role !== 'promoter' && user.role !== 'admin') {
          return errorResponse(res, 403, 'Only promoters or admins can publish campaigns');
        }

        const body = await parseBody(req);
        if (!body.title || !body.description || !body.target_amount || !body.category) {
          return errorResponse(res, 400, 'Title, description, category, and target amount are required');
        }

        const campaign = db.createCampaign({
          ...body,
          promoter_id: user.id
        });
        return jsonResponse(res, 201, campaign);
      }

      if (campaignIdMatch && method === 'PUT') {
        const user = getAuthUser(req);
        if (!user) return errorResponse(res, 401, 'Unauthorized');
        const campaignId = parseInt(campaignIdMatch[1], 10);
        const existing = db.getCampaignById(campaignId);
        if (!existing) return errorResponse(res, 404, 'Campaign not found');

        if (user.role !== 'admin' && existing.promoter_id !== user.id) {
          return errorResponse(res, 403, 'Permission denied');
        }

        const body = await parseBody(req);
        const updated = db.updateCampaign(campaignId, body);
        return jsonResponse(res, 200, updated);
      }

      if (campaignIdMatch && method === 'DELETE') {
        const user = getAuthUser(req);
        if (!user) return errorResponse(res, 401, 'Unauthorized');
        const campaignId = parseInt(campaignIdMatch[1], 10);
        const existing = db.getCampaignById(campaignId);
        if (!existing) return errorResponse(res, 404, 'Campaign not found');

        if (user.role !== 'admin' && existing.promoter_id !== user.id) {
          return errorResponse(res, 403, 'Permission denied');
        }

        db.deleteCampaign(campaignId);
        return jsonResponse(res, 200, { success: true, message: 'Campaign deleted' });
      }

      // 4. Investments / Delivery Orders
      if (pathname === '/api/investments' && method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return errorResponse(res, 401, 'Please sign in to invest');
        const body = await parseBody(req);
        const { campaign_id, amount, mentor_note } = body;

        if (!campaign_id || !amount || amount <= 0) {
          return errorResponse(res, 400, 'Valid campaign and investment amount are required');
        }

        try {
          const investment = db.createInvestment({
            userId: user.id,
            campaignId: parseInt(campaign_id, 10),
            amount: parseFloat(amount),
            mentorNote: mentor_note
          });
          return jsonResponse(res, 201, investment);
        } catch (err) {
          return errorResponse(res, 400, err.message);
        }
      }

      if (pathname === '/api/investments/my' && method === 'GET') {
        const user = getAuthUser(req);
        if (!user) return errorResponse(res, 401, 'Unauthorized');
        const list = db.getUserInvestments(user.id);
        return jsonResponse(res, 200, list);
      }

      // 5. Milestones
      if (pathname === '/api/milestones' && method === 'POST') {
        const user = getAuthUser(req);
        if (!user) return errorResponse(res, 401, 'Unauthorized');
        const body = await parseBody(req);
        const campaign = db.getCampaignById(body.campaign_id);
        if (!campaign) return errorResponse(res, 404, 'Campaign not found');

        if (user.role !== 'admin' && campaign.promoter_id !== user.id) {
          return errorResponse(res, 403, 'Permission denied');
        }

        const milestone = db.createMilestone({
          campaignId: body.campaign_id,
          title: body.title,
          description: body.description,
          targetPercentage: body.target_percentage,
          proofUrl: body.proof_url,
          proofNote: body.proof_note,
          status: body.status || 'pending'
        });
        return jsonResponse(res, 201, milestone);
      }

      const milestoneIdMatch = pathname.match(/^\/api\/milestones\/(\d+)$/);
      if (milestoneIdMatch && method === 'PUT') {
        const user = getAuthUser(req);
        if (!user) return errorResponse(res, 401, 'Unauthorized');
        const body = await parseBody(req);
        const updated = db.updateMilestone(parseInt(milestoneIdMatch[1], 10), body);
        return jsonResponse(res, 200, updated);
      }

      // ==========================================
      // 6. PRIVATE ADMIN PANEL API ROUTES
      // ==========================================
      if (pathname.startsWith('/api/admin/')) {
        const adminUser = getAuthUser(req);
        if (!adminUser || adminUser.role !== 'admin') {
          return errorResponse(res, 403, 'Access denied. Administrator privileges required.');
        }

        // Overview / Stats
        if (pathname === '/api/admin/overview' && method === 'GET') {
          const stats = db.getPlatformStats();
          return jsonResponse(res, 200, stats);
        }

        // Users Management
        if (pathname === '/api/admin/users' && method === 'GET') {
          const users = db.getAllUsers();
          return jsonResponse(res, 200, users);
        }

        const adminUserIdMatch = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
        if (adminUserIdMatch && method === 'PUT') {
          const targetId = parseInt(adminUserIdMatch[1], 10);
          const body = await parseBody(req);
          const updated = db.updateUser(targetId, body);
          return jsonResponse(res, 200, updated);
        }

        if (adminUserIdMatch && method === 'DELETE') {
          const targetId = parseInt(adminUserIdMatch[1], 10);
          if (targetId === adminUser.id) {
            return errorResponse(res, 400, 'Cannot delete your own admin account');
          }
          db.deleteUser(targetId);
          return jsonResponse(res, 200, { success: true, message: 'User deleted' });
        }

        // Campaigns Management
        if (pathname === '/api/admin/campaigns' && method === 'GET') {
          const allCampaigns = db.getCampaigns({ status: null }); // Get all statuses
          return jsonResponse(res, 200, allCampaigns);
        }

        const adminCampStatusMatch = pathname.match(/^\/api\/admin\/campaigns\/(\d+)\/status$/);
        if (adminCampStatusMatch && method === 'PUT') {
          const campId = parseInt(adminCampStatusMatch[1], 10);
          const body = await parseBody(req);
          const updated = db.updateCampaign(campId, { status: body.status });
          return jsonResponse(res, 200, updated);
        }

        const adminCampFeaturedMatch = pathname.match(/^\/api\/admin\/campaigns\/(\d+)\/featured$/);
        if (adminCampFeaturedMatch && method === 'PUT') {
          const campId = parseInt(adminCampFeaturedMatch[1], 10);
          const body = await parseBody(req);
          const updated = db.updateCampaign(campId, { is_featured: !!body.is_featured });
          return jsonResponse(res, 200, updated);
        }

        // Investments / Orders Management
        if (pathname === '/api/admin/investments' && method === 'GET') {
          const orders = db.getAllInvestments();
          return jsonResponse(res, 200, orders);
        }

        const adminInvStatusMatch = pathname.match(/^\/api\/admin\/investments\/(\d+)\/status$/);
        if (adminInvStatusMatch && method === 'PUT') {
          const invId = parseInt(adminInvStatusMatch[1], 10);
          const body = await parseBody(req);
          const updated = db.updateInvestmentStatus(invId, body.status);
          return jsonResponse(res, 200, updated);
        }

        // Global Platform Settings (all alterable by admin!)
        if (pathname === '/api/admin/settings' && method === 'GET') {
          const settings = db.getAllSettingsList();
          return jsonResponse(res, 200, settings);
        }

        if (pathname === '/api/admin/settings' && method === 'PUT') {
          const body = await parseBody(req);
          // body can be an array of { setting_key, setting_value } or key-value object
          if (Array.isArray(body)) {
            for (const item of body) {
              if (item.setting_key && item.setting_value !== undefined) {
                db.updateSetting(item.setting_key, String(item.setting_value));
              }
            }
          } else if (typeof body === 'object') {
            for (const [key, val] of Object.entries(body)) {
              db.updateSetting(key, String(val));
            }
          }
          return jsonResponse(res, 200, { success: true, settings: db.getSettings() });
        }
      }

      return errorResponse(res, 404, `API route not found: ${pathname}`);
    } catch (err) {
      console.error('API Error:', err);
      return errorResponse(res, 500, 'Internal Server Error: ' + err.message);
    }
  }

  // --- Static Asset Serving ---
  serveStaticFile(req, res, pathname);
}

// Create HTTP server instance
const server = http.createServer(handleRequest);

// Start listening if run directly via `node server.js`
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 GenBridge Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving frontend from ${PUBLIC_DIR}`);
    console.log(`🛡️  Admin Panel URL: http://localhost:${PORT}/#/admin`);
    console.log(`👤 Demo Accounts:`);
    console.log(`   - Admin:    admin@genbridge.org  (Pass: admin123)`);
    console.log(`   - Promoter: alex@creator.com    (Pass: promoter123)`);
    console.log(`   - Investor: robert@investor.com (Pass: user123)`);
    console.log(`=======================================================`);
  });
}

// Export for Vercel serverless functions and testing
module.exports = server;
module.exports.server = server;
module.exports.handleRequest = handleRequest;

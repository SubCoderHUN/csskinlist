const express = require('express');
const router = express.Router();
const pool = require('../db');

// Mock data — used when MySQL is unavailable (development without XAMPP running)
const MOCK_BANS = [
  { bid: 1, name: 'xX_HeadShot_Xx', authid: 'STEAM_0:1:12345678', reason: 'Aimbot', created: Date.now() / 1000 - 86400 * 2, ends: Date.now() / 1000 + 86400 * 28, length: 43200, admin_name: '[A] NexxoN Admin', country: 'HU', type: 0 },
  { bid: 2, name: 'AWP_Noob420', authid: 'STEAM_0:0:87654321', reason: 'Wallhack', created: Date.now() / 1000 - 86400 * 5, ends: 0, length: 0, admin_name: '[A] NexxoN Admin', country: 'HU', type: 0 },
  { bid: 3, name: 'ProGamer_HUN', authid: 'STEAM_0:1:11223344', reason: 'Toxic viselkedés', created: Date.now() / 1000 - 86400 * 1, ends: Date.now() / 1000 + 86400 * 7, length: 10080, admin_name: '[MOD] Zoli', country: 'HU', type: 0 },
  { bid: 4, name: 'SpeedHacker99', authid: 'STEAM_0:0:55667788', reason: 'Speedhack', created: Date.now() / 1000 - 86400 * 10, ends: 0, length: 0, admin_name: '[A] NexxoN Admin', country: 'SK', type: 0 },
  { bid: 5, name: 'Rusher_Boy', authid: 'STEAM_0:1:99887766', reason: 'Csapattársak ölése (TK)', created: Date.now() / 1000 - 3600 * 3, ends: Date.now() / 1000 + 3600 * 48, length: 2880, admin_name: '[MOD] Peti', country: 'HU', type: 0 },
  { bid: 6, name: 'Toxic_Player_HU', authid: 'STEAM_0:0:44332211', reason: 'Rasszista kommentek', created: Date.now() / 1000 - 86400 * 3, ends: Date.now() / 1000 + 86400 * 14, length: 20160, admin_name: '[A] NexxoN Admin', country: 'HU', type: 0 },
  { bid: 7, name: 'BunnyHop_King', authid: 'STEAM_0:1:77665544', reason: 'Scriptelés', created: Date.now() / 1000 - 86400 * 7, ends: Date.now() / 1000 + 86400 * 21, length: 30240, admin_name: '[MOD] Zoli', country: 'RO', type: 0 },
  { bid: 8, name: 'Griefer2023', authid: 'STEAM_0:0:33221100', reason: 'Griefing / Trollkodás', created: Date.now() / 1000 - 86400 * 0.5, ends: Date.now() / 1000 + 86400 * 3, length: 4320, admin_name: '[MOD] Peti', country: 'HU', type: 0 },
  { bid: 9, name: 'HvH_Player', authid: 'STEAM_0:1:22334455', reason: 'HvH kliens detektálva', created: Date.now() / 1000 - 86400 * 14, ends: 0, length: 0, admin_name: '[A] NexxoN Admin', country: 'HU', type: 0 },
  { bid: 10, name: 'AWP_Camper_Pro', authid: 'STEAM_0:0:66554433', reason: 'Sértő nick', created: Date.now() / 1000 - 86400 * 6, ends: Date.now() / 1000 + 86400 * 4, length: 5760, admin_name: '[MOD] Zoli', country: 'HU', type: 0 },
  { bid: 11, name: 'Floodbotter', authid: 'STEAM_0:1:10293847', reason: 'Chat flood / spam', created: Date.now() / 1000 - 86400 * 4, ends: Date.now() / 1000 + 86400 * 2, length: 2880, admin_name: '[MOD] Peti', country: 'PL', type: 0 },
  { bid: 12, name: 'SilentAimGod', authid: 'STEAM_0:0:19283746', reason: 'Silent aim hack', created: Date.now() / 1000 - 86400 * 20, ends: 0, length: 0, admin_name: '[A] NexxoN Admin', country: 'HU', type: 0 },
];

// GET /api/bans
// Query params: page, limit, search
router.get('/', async (req, res) => {
  const page    = Math.max(1, parseInt(req.query.page)  || 1);
  const limit   = Math.min(50, Math.max(5, parseInt(req.query.limit) || 20));
  const search  = (req.query.search || '').trim();
  const offset  = (page - 1) * limit;

  try {
    let rows, countResult;

    if (search) {
      const like = `%${search}%`;
      [rows] = await pool.query(
        `SELECT bid, name, authid, reason, created, ends, length, type,
                (SELECT name FROM sb_admins WHERE aid = b.aid) AS admin_name,
                country
         FROM sb_bans b
         WHERE (name LIKE ? OR authid LIKE ?)
         ORDER BY created DESC
         LIMIT ? OFFSET ?`,
        [like, like, limit, offset]
      );
      [[countResult]] = await pool.query(
        `SELECT COUNT(*) AS total FROM sb_bans WHERE name LIKE ? OR authid LIKE ?`,
        [like, like]
      );
    } else {
      [rows] = await pool.query(
        `SELECT bid, name, authid, reason, created, ends, length, type,
                (SELECT name FROM sb_admins WHERE aid = b.aid) AS admin_name,
                country
         FROM sb_bans b
         ORDER BY created DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      [[countResult]] = await pool.query(`SELECT COUNT(*) AS total FROM sb_bans`);
    }

    return res.json({
      bans: rows,
      total: countResult.total,
      page,
      limit,
      pages: Math.ceil(countResult.total / limit),
      mock: false,
    });

  } catch (err) {
    // DB unavailable — fall back to mock data
    console.warn('[BANS] DB hiba, mock adatok használata:', err.message);

    let filtered = MOCK_BANS;
    if (search) {
      const q = search.toLowerCase();
      filtered = MOCK_BANS.filter(b =>
        b.name.toLowerCase().includes(q) || b.authid.toLowerCase().includes(q)
      );
    }

    const total = filtered.length;
    const bans  = filtered.slice(offset, offset + limit);

    return res.json({
      bans,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      mock: true,
    });
  }
});

module.exports = router;

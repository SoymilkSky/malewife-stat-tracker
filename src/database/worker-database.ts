// Worker-specific database functions using native D1 bindings
// These functions work directly with the D1Database from env.DB

// Worker-specific database functions that use env.DB directly
export async function addUserPointsWorker(
  db: D1Database,
  receiverDiscordId: string,
  giverDiscordId: string,
  categoryName: string,
  amount: number,
  reason?: string,
) {
  // First ensure both users exist and get their internal user_ids
  await db
    .prepare(`INSERT OR IGNORE INTO users (discord_id) VALUES (?)`)
    .bind(receiverDiscordId)
    .run();

  await db
    .prepare(`INSERT OR IGNORE INTO users (discord_id) VALUES (?)`)
    .bind(giverDiscordId)
    .run();

  // Get internal user IDs
  const receiver = await db
    .prepare(`SELECT user_id FROM users WHERE discord_id = ?`)
    .bind(receiverDiscordId)
    .first();

  const giver = await db
    .prepare(`SELECT user_id FROM users WHERE discord_id = ?`)
    .bind(giverDiscordId)
    .first();

  if (!receiver || !giver) {
    throw new Error('Failed to create or find users');
  }

  // Get category ID
  const category = await db
    .prepare(`SELECT id FROM point_categories WHERE name = ?`)
    .bind(categoryName)
    .first();

  if (!category) {
    throw new Error(`Category '${categoryName}' not found`);
  }

  // Update user points
  await db
    .prepare(
      `
      INSERT INTO user_points (user_id, category_id, points) 
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, category_id) 
      DO UPDATE SET points = points + ?
    `,
    )
    .bind(receiver.user_id, category.id, amount, amount)
    .run();

  // Log transaction
  await db
    .prepare(
      `
      INSERT INTO point_transactions (receiver_id, giver_id, category_id, amount, reason)
      VALUES (?, ?, ?, ?, ?)
    `,
    )
    .bind(receiver.user_id, giver.user_id, category.id, amount, reason)
    .run();

  console.log(`Added ${amount} ${categoryName} points to ${receiverDiscordId}`);
}

export async function getUserStatsWorker(db: D1Database, discordId: string) {
  const result = await db
    .prepare(
      `
      SELECT 
        pc.name as category_name,
        up.points
      FROM user_points up
      JOIN point_categories pc ON up.category_id = pc.id
      JOIN users u ON up.user_id = u.user_id
      WHERE u.discord_id = ? AND up.points > 0
      ORDER BY pc.name
    `,
    )
    .bind(discordId)
    .all();

  return result.results || [];
}

export async function getTopUsersWorker(
  db: D1Database,
  categoryName?: string,
  limit: number = 10,
) {
  let query = `
    SELECT 
      u.discord_id as user_id,
      pc.name as category_name,
      up.points
    FROM user_points up
    JOIN point_categories pc ON up.category_id = pc.id
    JOIN users u ON up.user_id = u.user_id
    WHERE up.points > 0
  `;

  const params = [];

  if (categoryName) {
    query += ` AND pc.name = ?`;
    params.push(categoryName);
  }

  query += ` ORDER BY up.points DESC LIMIT ?`;
  params.push(limit.toString());

  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).all();

  return result.results || [];
}

export async function getUserPointHistoryWorker(
  db: D1Database,
  discordId: string,
  categoryName?: string,
  limit: number = 20,
) {
  let query = `
    SELECT 
      pt.amount,
      pt.reason,
      pt.created_at,
      pc.name as category_name,
      giver.discord_id as giver_id
    FROM point_transactions pt
    JOIN point_categories pc ON pt.category_id = pc.id
    JOIN users receiver ON pt.receiver_id = receiver.user_id
    JOIN users giver ON pt.giver_id = giver.user_id
    WHERE receiver.discord_id = ?
  `;

  const params = [discordId];

  if (categoryName) {
    query += ` AND pc.name = ?`;
    params.push(categoryName);
  }

  query += ` ORDER BY pt.created_at DESC LIMIT ?`;
  params.push(limit.toString());

  const stmt = db.prepare(query);
  const result = await stmt.bind(...params).all();

  return result.results || [];
}

export async function initializeDatabaseWorker(db: D1Database) {
  // Create users table with separate discord_id
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create point_categories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS point_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);

  // Create user_points table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_points (
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      points BIGINT NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, category_id),
      FOREIGN KEY (user_id) REFERENCES users (user_id),
      FOREIGN KEY (category_id) REFERENCES point_categories (id)
    );
  `);

  // Create point_transactions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS point_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receiver_id INTEGER NOT NULL,
      giver_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (receiver_id) REFERENCES users (user_id),
      FOREIGN KEY (giver_id) REFERENCES users (user_id),
      FOREIGN KEY (category_id) REFERENCES point_categories (id)
    );
  `);

  // Insert default categories
  const categories = [
    'malewife',
    'manipulate',
    'mansplain',
    'gaslight',
    'gatekeep',
    'girlboss',
  ];

  for (const category of categories) {
    await db
      .prepare(`INSERT OR IGNORE INTO point_categories (name) VALUES (?)`)
      .bind(category)
      .run();
  }

  console.log('Database tables initialized for Worker');
}

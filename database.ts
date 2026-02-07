// Configuration - you'll need to set these environment variables
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;

export interface Database {
  prepare(query: string): Statement;
  exec(query: string): Promise<any>;
  batch(statements: Statement[]): Promise<any[]>;
}

export interface Statement {
  bind(...params: any[]): Statement;
  first(): Promise<any>;
  all(): Promise<{ results: any[] }>;
  run(): Promise<{ success: boolean; changes: number; meta: any }>;
}

class D1Statement implements Statement {
  private query: string;
  private params: any[] = [];

  constructor(query: string) {
    this.query = query;
  }

  bind = (...params: any[]): Statement => {
    this.params = params;
    return this;
  };

  first = async (): Promise<any> => {
    const result = await this.execute();
    return result.results?.[0] || null;
  };

  all = async (): Promise<{ results: any[] }> => {
    return await this.execute();
  };

  run = async (): Promise<{ success: boolean; changes: number; meta: any }> => {
    try {
      const result = await this.execute();
      return {
        success: result.success !== false,
        changes: result.meta?.changes || 0,
        meta: result.meta || {},
      };
    } catch (error) {
      return {
        success: false,
        changes: 0,
        meta: { error },
      };
    }
  };

  private execute = async (): Promise<any> => {
    if (
      !CLOUDFLARE_API_TOKEN ||
      !CLOUDFLARE_ACCOUNT_ID ||
      !CLOUDFLARE_DATABASE_ID
    ) {
      throw new Error(
        'Missing Cloudflare configuration. Please set CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and CLOUDFLARE_DATABASE_ID environment variables.',
      );
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sql: this.query,
            params: this.params,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Cloudflare API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as any;

      if (!data.success) {
        throw new Error(
          `Database query failed: ${data.errors?.[0]?.message || 'Unknown error'}`,
        );
      }

      // Return the first result if there are multiple
      const result = data.result[0] || {};
      return {
        results: result.results || [],
        meta: result.meta || {},
        success: data.success,
      };
    } catch (error: any) {
      console.error('Database error:', error.message);
      throw error;
    }
  };
}

class D1Database implements Database {
  prepare = (query: string): Statement => {
    return new D1Statement(query);
  };

  exec = async (query: string): Promise<any> => {
    const statement = new D1Statement(query);
    return await statement.all();
  };

  batch = async (statements: Statement[]): Promise<any[]> => {
    const results = [];
    for (const statement of statements) {
      const result = await statement.all();
      results.push(result);
    }
    return results;
  };
}

// Export database instance
export const db = new D1Database();

// Helper functions for common operations
export const initializeDatabase = async () => {
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
      .prepare(
        `
      INSERT OR IGNORE INTO point_categories (name) VALUES (?)
    `,
      )
      .bind(category)
      .run();
  }

  console.log('Database tables initialized with new schema');
};

// Example usage functions
export const getUserStats = async (discordId: string) => {
  const stmt = db.prepare(`
    SELECT 
      pc.name as category_name,
      up.points
    FROM user_points up
    JOIN point_categories pc ON up.category_id = pc.id
    JOIN users u ON up.user_id = u.user_id
    WHERE u.discord_id = ?
    ORDER BY pc.name
  `);
  return await stmt.bind(discordId).all();
};

export const addUserPoints = async (
  receiverDiscordId: string,
  giverDiscordId: string,
  categoryName: string,
  amount: number,
  reason?: string,
) => {
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
    const allCategories = await db
      .prepare(`SELECT id, name FROM point_categories`)
      .all();
    throw new Error(
      `Category '${categoryName}' not found. Available: ${allCategories.results?.map((c: any) => c.name).join(', ')}`,
    );
  }

  const categoryId = category.id;
  const receiverUserId = receiver.user_id;
  const giverUserId = giver.user_id;

  // Insert or update user_points
  const existingPoints = await db
    .prepare(`SELECT points FROM user_points WHERE user_id = ? AND category_id = ?`)
    .bind(receiverUserId, categoryId)
    .first();

  if (existingPoints) {
    await db
      .prepare(`UPDATE user_points SET points = points + ? WHERE user_id = ? AND category_id = ?`)
      .bind(amount, receiverUserId, categoryId)
      .run();
  } else {
    await db
      .prepare(`INSERT INTO user_points (user_id, category_id, points) VALUES (?, ?, ?)`)
      .bind(receiverUserId, categoryId, amount)
      .run();
  }

  // Add transaction record
  await db
    .prepare(`INSERT INTO point_transactions (receiver_id, giver_id, category_id, amount, reason) VALUES (?, ?, ?, ?, ?)`)
    .bind(receiverUserId, giverUserId, categoryId, amount, reason)
    .run();
};

export const getUserPointHistory = async (
  discordId: string,
  categoryName?: string,
  limit: number = 20,
) => {
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
  return await stmt.bind(...params).all();
};

export const getTopUsers = async (
  categoryName?: string,
  limit: number = 10,
) => {
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
  return await stmt.bind(...params).all();
};

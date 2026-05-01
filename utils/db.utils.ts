import { createConnection, RowDataPacket } from "mysql2/promise";

export interface DbUser {
  id: number;
  username: string;
  password: string;
  role: "admin" | "manager" | "user";
  display_name: string;
}

function dbConfig(): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
} {
  return {
    host: process.env.DEMO_DB_HOST || "localhost",
    port: parseInt(process.env.DEMO_DB_PORT || "3306"),
    user: process.env.DEMO_DB_USER || "demo_user",
    password: process.env.DEMO_DB_PASSWORD || "demo_password",
    database: process.env.DEMO_DB_NAME || "demo_app",
  };
}

export async function getUsersFromDb(): Promise<DbUser[]> {
  const conn = await createConnection(dbConfig());
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT id, username, password, role, display_name FROM users ORDER BY role",
    );
    return rows as DbUser[];
  } finally {
    await conn.end();
  }
}

export async function getUsersByRole(role: DbUser["role"]): Promise<DbUser[]> {
  const conn = await createConnection(dbConfig());
  try {
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT id, username, password, role, display_name FROM users WHERE role = ?",
      [role],
    );
    return rows as DbUser[];
  } finally {
    await conn.end();
  }
}

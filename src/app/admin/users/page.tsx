import { sql } from "@/lib/db";
import UsersAdmin from "@/components/users-admin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  let users: any[] = [];
  try {
    users = await sql`SELECT id,email,full_name,role,is_active,created_at FROM users ORDER BY created_at DESC` as any[];
  } catch { /* users table may not exist yet */ }
  return <UsersAdmin users={users} />;
}

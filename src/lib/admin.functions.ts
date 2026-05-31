import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const isAdmin = (data ?? []).some((r) => r.role === "super_admin" || r.role === "ceo" || r.role === "developer");
  if (!isAdmin) throw new Error("אין הרשאה (נדרש מנהל-על / מנכ\"ל / מתכנת)");
}

const InviteSchema = z.object({
  email: z.string().email("אימייל לא תקין"),
  full_name: z.string().min(1).max(120),
  phone: z.string().max(30).optional().nullable(),
  national_id: z.string().min(5).max(20).optional().nullable(),
  roles: z.array(z.string()).min(1, "בחר לפחות תפקיד אחד"),
});

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InviteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const redirectTo = `${process.env.VITE_PUBLIC_SITE_URL || ""}/login`;
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      data.email,
      { data: { full_name: data.full_name }, redirectTo: redirectTo || undefined },
    );
    if (error) throw new Error(error.message);
    const userId = invited.user?.id;
    if (!userId) throw new Error("לא הצליח ליצור משתמש");

    // Upsert profile fields
    await supabaseAdmin.from("profiles")
      .update({ full_name: data.full_name, phone: data.phone ?? null, national_id: data.national_id ?? null, email: data.email })
      .eq("user_id", userId);

    // Assign roles
    const rows = data.roles.map((role) => ({ user_id: userId, role: role as never, granted_by: context.userId }));
    const { error: rolesErr } = await supabaseAdmin.from("user_roles").insert(rows);
    if (rolesErr) throw new Error(rolesErr.message);

    return { ok: true, user_id: userId };
  });

const UpdateProfileSchema = z.object({
  profile_id: z.string().uuid(),
  full_name: z.string().min(1).max(120).optional(),
  phone: z.string().max(30).nullable().optional(),
  national_id: z.string().min(5).max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  scope_level: z.enum(["global","district","city","community"]).optional(),
  district_id: z.string().uuid().nullable().optional(),
  city_id: z.string().uuid().nullable().optional(),
  community_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    const { profile_id, ...rest } = data;
    const { error } = await supabaseAdmin.from("profiles").update(rest).eq("id", profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SetRolesSchema = z.object({
  user_id: z.string().uuid(),
  roles: z.array(z.string()),
});

export const setUserRoles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetRolesSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    // Replace all roles
    const { error: delErr } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    if (delErr) throw new Error(delErr.message);
    if (data.roles.length > 0) {
      const rows = data.roles.map((r) => ({ user_id: data.user_id, role: r as never, granted_by: context.userId }));
      const { error } = await supabaseAdmin.from("user_roles").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

const DeleteUserSchema = z.object({ user_id: z.string().uuid() });
export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.userId);
    if (data.user_id === context.userId) throw new Error("אי אפשר למחוק את עצמך");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

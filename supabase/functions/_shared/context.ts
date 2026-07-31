import {
  createClient,
  type SupabaseClient,
  type User,
} from 'https://esm.sh/@supabase/supabase-js@2.99.2';
import { ApiError } from './http.ts';

export interface Profile {
  auth_user_id: string;
  created_at: string;
  display_name: string;
  email: string;
  id: number;
  is_admin: boolean;
  last_login_at: string;
  picture_url: string | null;
}

export interface RequestContext {
  adminEmails: Set<string>;
  request: Request;
  service: SupabaseClient;
  supabaseAnonKey: string;
  supabaseUrl: string;
  url: URL;
}

export interface AuthenticatedContext {
  profile: Profile;
  user: User;
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new ApiError(500, 'missing_secret', `${name} 시크릿이 설정되지 않았습니다.`);
  }

  return value;
}

function parseAdminEmails(value: string | undefined) {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function createRequestContext(request: Request): RequestContext {
  const supabaseUrl = requiredSecret('SUPABASE_URL');
  const supabaseAnonKey = requiredSecret('SUPABASE_ANON_KEY');
  const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');

  return {
    adminEmails: parseAdminEmails(Deno.env.get('ADMIN_ALLOWED_EMAILS')),
    request,
    service: createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
    supabaseAnonKey,
    supabaseUrl,
    url: new URL(request.url),
  };
}

function getAccessToken(request: Request) {
  const authorization = request.headers.get('Authorization')?.trim();

  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

export async function getOptionalAuth(
  context: RequestContext,
): Promise<AuthenticatedContext | null> {
  const token = getAccessToken(context.request);

  if (!token || token === context.supabaseAnonKey) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await context.service.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  const { data: existingProfile, error: profileError } = await context.service
    .from('profiles')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    throw profileError;
  }

  const email = user.email?.trim().toLowerCase() ?? `${user.id}@unknown.local`;
  const displayName =
    String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '').trim() ||
    email.split('@')[0] ||
    '사용자';
  const pictureUrl =
    String(user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? '').trim() || null;
  const shouldBeAdmin = context.adminEmails.has(email);

  if (!existingProfile) {
    const { data: createdProfile, error: createError } = await context.service
      .from('profiles')
      .insert({
        auth_user_id: user.id,
        display_name: displayName,
        email,
        is_admin: shouldBeAdmin,
        last_login_at: new Date().toISOString(),
        picture_url: pictureUrl,
      })
      .select('*')
      .single<Profile>();

    if (createError) {
      throw createError;
    }

    return {
      profile: createdProfile,
      user,
    };
  }

  const requiresUpdate =
    existingProfile.display_name !== displayName ||
    existingProfile.email !== email ||
    existingProfile.picture_url !== pictureUrl ||
    (shouldBeAdmin && !existingProfile.is_admin);

  if (!requiresUpdate) {
    return {
      profile: existingProfile,
      user,
    };
  }

  const { data: updatedProfile, error: updateError } = await context.service
    .from('profiles')
    .update({
      display_name: displayName,
      email,
      is_admin: existingProfile.is_admin || shouldBeAdmin,
      last_login_at: new Date().toISOString(),
      picture_url: pictureUrl,
    })
    .eq('id', existingProfile.id)
    .select('*')
    .single<Profile>();

  if (updateError) {
    throw updateError;
  }

  return {
    profile: updatedProfile,
    user,
  };
}

export async function requireAuth(context: RequestContext) {
  const auth = await getOptionalAuth(context);

  if (!auth) {
    throw new ApiError(401, 'unauthorized', '로그인이 필요합니다.');
  }

  return auth;
}
export async function requireAdmin(context: RequestContext) {
  const auth = await requireAuth(context);

  if (!auth.profile.is_admin) {
    throw new ApiError(403, 'admin_required', '관리자 권한이 필요합니다.');
  }

  return auth;
}

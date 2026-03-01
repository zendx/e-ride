import { loginSchema } from "@/lib/validation/auth";
import { fail, ok } from "@/lib/http";
import { login } from "@/lib/modules/auth/service";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    await enforceRateLimit(`rl:auth:login:${ip}`, 20, 60);

    const body = await request.json();
    const input = loginSchema.parse(body);
    const result = await login(input.email, input.password, input.tenantSlug);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

import { refreshSchema } from "@/lib/validation/auth";
import { fail, ok } from "@/lib/http";
import { refresh } from "@/lib/modules/auth/service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = refreshSchema.parse(body);
    const result = await refresh(input.refreshToken);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}

import { DurableObject } from "cloudflare:workers";

// One instance per key (device/IP/global per UTC day). Durable Object input gates make
// the read-then-write atomic.
export class QuotaCounter extends DurableObject<Env> {
  async hit(limit: number): Promise<{ allowed: boolean; count: number }> {
    const n = (await this.ctx.storage.get<number>("n")) ?? 0;
    if (n >= limit) return { allowed: false, count: n };
    await this.ctx.storage.put("n", n + 1);
    return { allowed: true, count: n + 1 };
  }
}

export type QuotaScope = "device" | "ip" | "global";

export async function checkDailyQuota(env: Env, deviceId: string, ip: string): Promise<QuotaScope | null> {
  const day = new Date().toISOString().slice(0, 10);
  const checks: Array<[QuotaScope, string, number]> = [
    ["device", `d:${deviceId}:${day}`, Number(env.DEVICE_DAILY_LIMIT)],
    ["ip", `i:${ip}:${day}`, Number(env.IP_DAILY_LIMIT)],
    ["global", `g:${day}`, Number(env.GLOBAL_DAILY_LIMIT)],
  ];
  for (const [scope, key, limit] of checks) {
    const stub = env.QUOTA.get(env.QUOTA.idFromName(key));
    const { allowed } = await stub.hit(limit);
    if (!allowed) return scope;
  }
  return null;
}

"use server";

import { db } from "@/db";
import { prompts, categories } from "@/db/schema";
import { getTenantId } from "@/lib/auth";
import { promptSchema } from "@/lib/validations/prompt";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * 获取当前租户下的所有监测问题，支持按分类和国家进行筛选。
 */
export async function getPrompts(filters?: { categoryId?: string; countryCode?: string }) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");

  const conditions = [eq(prompts.tenantId, tenantId)];
  
  if (filters?.categoryId && filters.categoryId !== "all") {
    conditions.push(eq(prompts.categoryId, filters.categoryId));
  }
  
  if (filters?.countryCode && filters.countryCode !== "all") {
    conditions.push(eq(prompts.countryCode, filters.countryCode));
  }

  return await db.query.prompts.findMany({
    where: and(...conditions),
    with: {
      category: true,
    },
    orderBy: [desc(prompts.createdAt)],
  });
}

/**
 * 创建新监测问题。
 */
export async function createPrompt(data: any) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");

  const validated = promptSchema.parse(data);

  const result = await db.insert(prompts).values({
    ...validated,
    tenantId,
  }).returning();

  revalidatePath("/dashboard/prompts");
  return result[0];
}

/**
 * 批量创建监测问题。
 */
export async function createPrompts(data: any[]) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");

  const validatedData = data.map(item => ({
    ...promptSchema.parse(item),
    tenantId,
  }));

  const result = await db.insert(prompts).values(validatedData).returning();

  revalidatePath("/dashboard/prompts");
  return result;
}

/**
 * 更新监测问题。
 */
export async function updatePrompt(id: string, data: any) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");

  const validated = promptSchema.parse(data);

  const result = await db.update(prompts)
    .set(validated)
    .where(and(eq(prompts.id, id), eq(prompts.tenantId, tenantId)))
    .returning();

  revalidatePath("/dashboard/prompts");
  return result[0];
}

/**
 * 删除监测问题。
 */
export async function deletePrompt(id: string) {
  const tenantId = await getTenantId();
  if (!tenantId) throw new Error("Unauthorized");

  await db.delete(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.tenantId, tenantId)));

  revalidatePath("/dashboard/prompts");
}

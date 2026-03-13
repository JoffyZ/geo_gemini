import { NextResponse } from 'next/server'
import { db } from '@/db'
import { prompts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getTenantId } from '@/lib/auth'

/**
 * GET /api/prompts:
 * 获取当前租户下的所有提示词 (Filtered by tenant_id)
 */
export async function GET() {
  const tenantId = await getTenantId()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await db
      .select()
      .from(prompts)
      .where(eq(prompts.tenantId, tenantId))

    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to fetch prompts:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/prompts:
 * 为当前租户创建一个新的提示词
 */
export async function POST(request: Request) {
  const tenantId = await getTenantId()

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content, categoryId } = body

    if (!content || !categoryId) {
      return NextResponse.json({ error: 'Missing content or categoryId' }, { status: 400 })
    }

    const [newPrompt] = await db
      .insert(prompts)
      .values({
        content,
        categoryId,
        tenantId,
      })
      .returning()

    return NextResponse.json(newPrompt)
  } catch (error) {
    console.error('Failed to create prompt:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

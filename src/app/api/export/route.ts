import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { monitoringResults, prompts, categories } from '@/db/schema';
import { eq, and, between, inArray, desc } from 'drizzle-orm';
import { getTenantId } from '@/lib/auth';
import {
  BOM,
  CSV_HEADERS,
  formatCSVRow,
  transformToCSVRow,
  ExportDataRow,
} from '@/lib/export/csv-generator';

export async function GET(request: NextRequest) {
  try {
    const tenantId = await getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const countryCodes = searchParams.get('countryCodes')?.split(',').filter(Boolean);
    const categoryIds = searchParams.get('categoryIds')?.split(',').filter(Boolean);

    // 构建查询条件
    const conditions = [eq(monitoringResults.tenantId, tenantId)];

    if (startDate && endDate) {
      conditions.push(
        between(
          monitoringResults.createdAt,
          new Date(startDate),
          new Date(`${endDate}T23:59:59.999Z`)
        )
      );
    } else if (startDate) {
      conditions.push(between(monitoringResults.createdAt, new Date(startDate), new Date()));
    }

    if (countryCodes && countryCodes.length > 0) {
      conditions.push(inArray(monitoringResults.countryCode, countryCodes));
    }

    if (categoryIds && categoryIds.length > 0) {
      conditions.push(inArray(prompts.categoryId, categoryIds));
    }

    // 执行查询
    // 为了满足流式处理，理论上可以使用数据库游标，但在 drizzle/postgres-js 下通常需要特殊处理。
    // 这里先获取全量数据（针对常规导出量，内存可控），后续可优化为分页循环或游标。
    const results = await db
      .select({
        createdAt: monitoringResults.createdAt,
        aiPlatform: monitoringResults.aiPlatform,
        countryCode: monitoringResults.countryCode,
        content: monitoringResults.content,
        promptContent: prompts.content,
        categoryName: categories.name,
      })
      .from(monitoringResults)
      .innerJoin(prompts, eq(monitoringResults.promptId, prompts.id))
      .innerJoin(categories, eq(prompts.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(monitoringResults.createdAt))
      .execute();

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // 1. 写入 BOM 以解决 Excel 乱码
        controller.enqueue(encoder.encode(BOM));
        // 2. 写入表头
        controller.enqueue(encoder.encode(formatCSVRow(CSV_HEADERS)));

        // 3. 遍历并平铺数据
        for (const res of results) {
          const content = res.content as {
            brands?: Array<{
              name: string;
              rank: number;
              sentiment: string;
              mentions?: number;
              citations?: number;
            }>;
          };
          const brands = content.brands || [];

          if (brands.length === 0) {
            // 没有品牌提及，记录一行占位
            const row: ExportDataRow = {
              createdAt: res.createdAt,
              promptContent: res.promptContent,
              aiPlatform: res.aiPlatform,
              countryCode: res.countryCode,
              categoryName: res.categoryName,
              brandName: null,
              rank: null,
              sentiment: null,
              mentions: null,
            };
            controller.enqueue(encoder.encode(transformToCSVRow(row)));
          } else {
            // 每一个提及的品牌生成一行
            for (const brand of brands) {
              const row: ExportDataRow = {
                createdAt: res.createdAt,
                promptContent: res.promptContent,
                aiPlatform: res.aiPlatform,
                countryCode: res.countryCode,
                categoryName: res.categoryName,
                brandName: brand.name,
                rank: brand.rank,
                sentiment: brand.sentiment,
                mentions: brand.mentions ?? brand.citations ?? 0,
              };
              controller.enqueue(encoder.encode(transformToCSVRow(row)));
            }
          }
        }
        controller.close();
      },
    });

    const filename = `export-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

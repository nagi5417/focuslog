"use server";

import { requireUser } from "@/lib/auth/helpers";
import { prisma } from "@/lib/db";
import { reportSummaryInputSchema } from "@/lib/validations/report";
import { jstStartOfWeek, toJstDate } from "@/lib/utils/date";
import type {
  ReportBreakdownItem,
  ReportPeriod,
  ReportSeriesPoint,
  ReportSummary,
} from "@/types";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET = 9 * 60 * 60 * 1000;

type SummaryEntry = {
  startedAt: Date;
  durationSec: number | null;
  task: {
    project: { id: string; name: string; color: string | null } | null;
    tagLinks: {
      tag: { id: string; name: string; color: string | null };
    }[];
  } | null;
};

type Bucket = {
  id: string | null;
  name: string;
  color: string | null;
  seconds: number;
};

function jstStartOfMonth(ref: Date): Date {
  const jst = toJstDate(ref);
  const start = new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  return new Date(start.getTime() - JST_OFFSET);
}

function addBucket(
  map: Map<string, Bucket>,
  key: string,
  item: Omit<Bucket, "seconds">,
  seconds: number,
) {
  const current = map.get(key);
  if (current) {
    current.seconds += seconds;
    return;
  }
  map.set(key, { ...item, seconds });
}

function toBreakdown(map: Map<string, Bucket>): ReportBreakdownItem[] {
  return [...map.values()]
    .filter((item) => item.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds)
    .map(({ id, name, color, seconds }) => ({ id, name, color, seconds }));
}

function buildSeries(
  period: ReportPeriod,
  start: Date,
  end: Date,
  entries: SummaryEntry[],
): ReportSeriesPoint[] {
  const length =
    period === "week"
      ? 7
      : Math.ceil((end.getTime() - start.getTime()) / ONE_DAY_MS);
  const labels =
    period === "week"
      ? ["月", "火", "水", "木", "金", "土", "日"]
      : Array.from({ length }, (_, i) => String(i + 1));
  const seconds = Array.from({ length }, () => 0);

  for (const entry of entries) {
    const jstStarted = toJstDate(entry.startedAt);
    const jstStart = toJstDate(start);
    const index = Math.floor(
      (jstStarted.getTime() - jstStart.getTime()) / ONE_DAY_MS,
    );
    if (index >= 0 && index < seconds.length) {
      seconds[index] += entry.durationSec ?? 0;
    }
  }

  return labels.map((label, index) => ({ label, seconds: seconds[index] }));
}

function rangeLabel(period: ReportPeriod, start: Date, end: Date): string {
  const jstStart = toJstDate(start);
  const jstEnd = toJstDate(new Date(end.getTime() - 1));
  if (period === "month") {
    return `${jstStart.getUTCFullYear()}年${jstStart.getUTCMonth() + 1}月`;
  }
  return `${jstStart.getUTCMonth() + 1}月${jstStart.getUTCDate()}日 - ${
    jstEnd.getUTCMonth() + 1
  }月${jstEnd.getUTCDate()}日`;
}

export async function getReportSummary(
  input: unknown,
): Promise<ReportSummary> {
  const user = await requireUser();
  const parsed = reportSummaryInputSchema.parse(input);
  const anchorDate = parsed.anchorDate ?? new Date();
  const start =
    parsed.period === "week"
      ? jstStartOfWeek(anchorDate)
      : jstStartOfMonth(anchorDate);
  const end =
    parsed.period === "week"
      ? new Date(start.getTime() + 7 * ONE_DAY_MS)
      : new Date(
          Date.UTC(
            toJstDate(start).getUTCFullYear(),
            toJstDate(start).getUTCMonth() + 1,
            1,
            0,
            0,
            0,
            0,
          ) - JST_OFFSET,
        );

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: user.id,
      endedAt: { not: null },
      durationSec: { not: null },
      startedAt: { gte: start, lt: end },
    },
    orderBy: { startedAt: "asc" },
    select: {
      startedAt: true,
      durationSec: true,
      task: {
        select: {
          project: { select: { id: true, name: true, color: true } },
          tagLinks: {
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
        },
      },
    },
  });

  const totalSec = entries.reduce((sum, entry) => sum + (entry.durationSec ?? 0), 0);
  const series = buildSeries(parsed.period, start, end, entries);
  const activeDays = series.filter((point) => point.seconds > 0).length || 1;
  const projectMap = new Map<string, Bucket>();
  const tagMap = new Map<string, Bucket>();

  for (const entry of entries) {
    const seconds = entry.durationSec ?? 0;
    const project = entry.task?.project;
    addBucket(
      projectMap,
      project?.id ?? "none",
      {
        id: project?.id ?? null,
        name: project?.name ?? "プロジェクトなし",
        color: project?.color ?? null,
      },
      seconds,
    );

    const tags = entry.task?.tagLinks ?? [];
    if (tags.length === 0) {
      addBucket(
        tagMap,
        "none",
        { id: null, name: "タグなし", color: null },
        seconds,
      );
    } else {
      for (const { tag } of tags) {
        addBucket(
          tagMap,
          tag.id,
          { id: tag.id, name: tag.name, color: tag.color },
          seconds,
        );
      }
    }
  }

  return {
    period: parsed.period,
    rangeLabel: rangeLabel(parsed.period, start, end),
    totalSec,
    averageSec: Math.round(totalSec / activeDays),
    sessionCount: entries.length,
    series,
    projects: toBreakdown(projectMap),
    tags: toBreakdown(tagMap),
  };
}

'use client';
import { Mail, ScanLine, PenLine, ArrowUpRight, CheckCircle2, Trash2, RotateCcw } from "lucide-react";

export interface ReturnCase {
  id: string;
  productName: string;
  retailer: string;
  purchaseDate: string;
  deliveryDate?: string;
  price?: number;
  returnWindowDays: number;
  deadlineDate: string;
  daysRemaining: number;
  status: 'Action Recommended' | 'Monitoring' | 'Completed' | 'Expired';
  confidenceScore: number;
  source: 'OCR Upload' | 'Email Webhook';
}

export function ReturnRow({
  item,
  onDelete,
  onComplete,
  onReactivate,
}: {
  item: ReturnCase;
  onDelete: (id: string) => void;
  onComplete?: (id: string) => void;
  onReactivate?: (id: string) => void;
}) {
  const isUrgent = item.daysRemaining <= 7 && item.daysRemaining >= 0 && item.status !== 'Completed';
  const isExpired = item.daysRemaining < 0 && item.status !== 'Completed';
  const isSafe = item.daysRemaining > 7 && item.status !== 'Completed';
  const isCompleted = item.status === 'Completed';

  // Status visual styles
  const statusStyles = {
    rail: isCompleted
      ? "bg-safe"
      : isExpired
      ? "bg-muted-foreground/30"
      : isUrgent
      ? "bg-critical"
      : isSafe
      ? "bg-safe"
      : "bg-warning",
    badge: isCompleted
      ? "bg-safe-soft text-safe border-safe/25 font-semibold"
      : isExpired
      ? "bg-secondary text-muted-foreground border-border"
      : isUrgent
      ? "bg-critical-soft text-critical border-critical/25 font-semibold"
      : isSafe
      ? "bg-safe-soft text-safe border-safe/25 font-medium"
      : "bg-warning-soft text-warning border-warning/25 font-medium",
    bar: isCompleted
      ? "bg-safe"
      : isExpired
      ? "bg-muted-foreground/40"
      : isUrgent
      ? "bg-critical"
      : isSafe
      ? "bg-safe"
      : "bg-warning",
    label: isCompleted ? "Completed" : isExpired ? "Past deadline" : isUrgent ? "Action needed" : "Monitoring",
  };

  const SourceIcon = item.source === 'Email Webhook' ? Mail : ScanLine;

  const returnPortalUrl = item.retailer.toLowerCase().includes('amazon')
    ? 'https://www.amazon.com/spr/returns'
    : item.retailer.toLowerCase().includes('best buy')
    ? 'https://www.bestbuy.com/returns'
    : item.retailer.toLowerCase().includes('walmart')
    ? 'https://www.walmart.com/returns'
    : item.retailer.toLowerCase().includes('apple')
    ? 'https://www.apple.com/shop/help/returns_refund'
    : item.retailer.toLowerCase().includes('target')
    ? 'https://www.target.com/returns'
    : `https://www.google.com/search?q=${encodeURIComponent(item.retailer + ' return policy portal')}`;

  return (
    <article className={`group relative overflow-hidden rounded-xl border border-border bg-surface-1 p-4 pl-5 transition-all duration-150 hover:border-border-strong hover:shadow-[var(--shadow-raised)] ${isCompleted ? 'opacity-80 grayscale-[0.2]' : ''}`}>
      {/* Urgency Color Rail */}
      <span className={`absolute inset-y-0 left-0 w-1 ${statusStyles.rail}`} aria-hidden />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: Icon & Main Information */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground border border-border">
            <SourceIcon className="size-4.5" strokeWidth={1.75} />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-[15px] font-semibold tracking-tight truncate max-w-sm ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {item.productName || 'Purchased Item'}
              </h3>
              {item.price ? (
                <span className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-xs font-medium text-foreground border border-border">
                  ${item.price.toFixed(2)}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/90">{item.retailer}</span>
              {item.purchaseDate && (
                <>
                  <span className="text-border-strong">•</span>
                  <span>Ordered {item.purchaseDate}</span>
                </>
              )}
              <span className="text-border-strong">•</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                <span className="inline-block size-1.5 rounded-full bg-primary/60" />
                {item.confidenceScore || 90}% AI Confidence
              </span>
            </div>
          </div>
        </div>

        {/* Right: Deadline Badge & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-2 md:pt-0 border-t border-border/50 md:border-t-0">
          <div className="flex flex-col sm:items-end gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${statusStyles.badge}`}>
                {isCompleted ? 'Returned' : isExpired ? 'Expired' : `${item.daysRemaining} days left`}
              </span>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Deadline: {item.deadlineDate} ({item.returnWindowDays}d)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isCompleted ? (
              <>
                <a
                  href={returnPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-surface-1 px-3 text-xs font-medium text-foreground transition hover:bg-secondary hover:text-primary shadow-2xs"
                >
                  <span>Return portal</span>
                  <ArrowUpRight className="size-3.5" strokeWidth={2} />
                </a>

                {onComplete && (
                  <button
                    onClick={() => onComplete(item.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-safe/30 bg-safe-soft px-2.5 text-xs font-semibold text-safe transition hover:bg-safe hover:text-white shadow-2xs cursor-pointer"
                    title="Mark item as Returned"
                    aria-label="Mark item as returned"
                  >
                    <CheckCircle2 className="size-3.5" strokeWidth={2} />
                    <span>Returned</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {onReactivate && (
                  <button
                    onClick={() => onReactivate(item.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2.5 text-xs font-medium text-muted-foreground transition hover:text-foreground hover:bg-secondary shadow-2xs cursor-pointer"
                    title="Move back to active tracking"
                    aria-label="Undo returned status"
                  >
                    <RotateCcw className="size-3" strokeWidth={2} />
                    <span>Undo</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => onDelete(item.id)}
              className="grid size-8 place-items-center rounded-md border border-transparent text-muted-foreground transition hover:border-border hover:bg-destructive/10 hover:text-destructive cursor-pointer"
              title="Remove from radar"
              aria-label="Remove item"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

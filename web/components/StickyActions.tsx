"use client";
import { CalendarPlus, Share2 } from "lucide-react";

export function StickyActions({
  onCalendar,
  onShare,
}: {
  onCalendar: () => void;
  onShare: () => void;
}) {
  return (
    <div className="sticky-actions">
      <div>
        <div className="card p-2 flex gap-2 justify-end">
          <button onClick={onShare} className="btn btn-outline">
            <Share2 size={16} className="mr-2" /> Compartir
          </button>
          <button onClick={onCalendar} className="btn btn-primary">
            <CalendarPlus size={16} className="mr-2" /> Agendar
          </button>
        </div>
      </div>
    </div>
  );
}

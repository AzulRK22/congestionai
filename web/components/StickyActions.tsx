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
        <div className="card flex gap-2 justify-end p-2">
          <button onClick={onShare} className="btn btn-outline">
            <Share2 size={16} className="mr-2" /> Share
          </button>
          <button onClick={onCalendar} className="btn btn-primary">
            <CalendarPlus size={16} className="mr-2" /> Add to calendar
          </button>
        </div>
      </div>
    </div>
  );
}

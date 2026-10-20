import React from 'react';
import { X } from 'lucide-react';

export default function AnnouncementBanner({ onClose }) {
  const message = 'The Draftout mod now supports n-player board drafting and this website will be shutting down soon. Thank you for using DraftBoard!';

  return (
    <aside
      aria-label="Service announcement"
      className="draftout-panel mc-bevel px-3 py-2 sm:px-4 sm:py-2.5 border border-amber-500/40 shadow-lg relative flex items-center justify-between gap-2.5 sm:gap-3 text-neutral-200"
    >
      <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-neutral-300 truncate" title={message}>
        <span className="font-pixel text-[10px] sm:text-xs tracking-wider uppercase px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0 select-none">
          Notice
        </span>
        <span className="truncate">
          The Draftout mod now supports n-player board drafting and this website will be{' '}
          <b className="font-bold text-white">shutting down</b> soon. Thank you for using DraftBoard!
        </span>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close announcement"
        className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800/80 border border-transparent hover:border-neutral-700 transition-colors cursor-pointer shrink-0"
        title="Dismiss announcement"
      >
        <X className="w-4 h-4" />
      </button>
    </aside>
  );
}

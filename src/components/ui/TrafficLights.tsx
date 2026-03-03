'use client';

import { X } from 'lucide-react';

interface TrafficLightsProps {
    onClose: () => void;
    title?: string;
}

export function TrafficLights({ onClose, title }: TrafficLightsProps) {
    return (
        <div className="modal-theme-titlebar flex items-center gap-2 px-4 py-2.5">
            <button
                type="button"
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all flex items-center justify-center group"
                title="Close"
            >
                <X className="w-2 h-2 text-[#990000] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
                type="button"
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:brightness-90 transition-all flex items-center justify-center group"
                title="Minimize"
            >
                <span className="w-1.5 h-0.5 bg-[#995700] opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
            </button>
            <button
                type="button"
                className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-90 transition-all flex items-center justify-center group cursor-default opacity-50"
                title="Expand"
            >
                <span className="w-1.5 h-1.5 border border-[#006500] opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
            </button>
            {title && <span className="ml-2 text-xs text-[var(--text-muted)] font-medium">{title}</span>}
        </div>
    );
}

// components/Time24Input.tsx
"use client";
import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";

export const normalizeTo24h = (timeStr: string | undefined | null): string => {
  if (!timeStr || typeof timeStr !== "string") return "00:00";
  const trimmed = timeStr.trim();
  if (!trimmed) return "00:00";
  if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm|AM|PM|a|p|A|P)$/i);
  if (match) {
    let [_, hourStr, minStr, period] = match;
    let hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    if (hour < 1 || hour > 12 || min < 0 || min > 59) {
      return trimmed;
    }
    const isPM = /^p/i.test(period);
    if (hour === 12) {
      hour = isPM ? 12 : 0;
    } else if (isPM) {
      hour += 12;
    }
    return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }
  return trimmed;
};

const parseTime = (time: string | undefined): { hour: number; minute: number } => {
  if (!time) return { hour: 0, minute: 0 };
  const normalized = normalizeTo24h(time);
  const [h, m] = normalized.split(":").map(Number);
  return { hour: h || 0, minute: m || 0 };
};

// ── Custom Select dengan max 5 item visible + scroll ──
interface MiniSelectProps {
  value: number;
  options: number[];
  onChange: (val: number) => void;
  label: string;
}

const MiniSelect: React.FC<MiniSelectProps> = ({ value, options, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const itemHeight = 36;
  const visibleCount = 5;

  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedIndex = options.indexOf(value);
      if (selectedIndex !== -1) {
        listRef.current.scrollTop = Math.max(0, selectedIndex * itemHeight - itemHeight * 2);
      }
    }
  }, [isOpen, value, options]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedLabel = String(value).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-1.5" ref={listRef}>
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-10 flex items-center justify-center gap-1 rounded-lg border-2 font-bold text-sm transition-all ${
            isOpen
              ? "border-orange-500 bg-orange-50 text-orange-700"
              : "border-orange-300 bg-orange-50 text-slate-900 hover:border-orange-400"
          }`}
        >
          <span>{selectedLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-orange-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 bg-white border-2 border-orange-300 rounded-lg shadow-xl overflow-hidden"
            style={{ width: "72px" }}
          >
            <div
              ref={listRef}
              className="overflow-y-auto scrollbar-hide"
              style={{ maxHeight: `${itemHeight * visibleCount}px` }}
            >
              {options.map((opt) => {
                const isSelected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      isSelected
                        ? "bg-orange-500 text-white"
                        : "text-slate-700 hover:bg-orange-50"
                    }`}
                    style={{ height: `${itemHeight}px` }}
                  >
                    {String(opt).padStart(2, "0")}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface TimeInput24Props {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

const TimeInput24: React.FC<TimeInput24Props> = ({
  value,
  onChange,
  disabled = false,
  className = "",
  label,
}) => {
  const { hour, minute } = parseTime(value);
  const [isOpen, setIsOpen] = useState(false);
  const [tempHour, setTempHour] = useState(hour);
  const [tempMinute, setTempMinute] = useState(minute);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempHour(hour);
    setTempMinute(minute);
  }, [hour, minute]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleApply = () => {
    const newTime = `${String(tempHour).padStart(2, "0")}:${String(tempMinute).padStart(2, "0")}`;
    onChange?.(newTime);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempHour(hour);
    setTempMinute(minute);
    setIsOpen(false);
  };

  const displayTime = value && value.trim() ? value : "--:--";

  const triggerBase = "w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-black focus:ring-2 focus:ring-orange-500 focus:border-transparent";

  if (disabled) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && <p className="text-xs font-medium text-slate-600">{label}</p>}
        <div className={`${triggerBase} bg-slate-100 text-slate-400 cursor-not-allowed flex items-center gap-2`}>
          <Clock className="w-4 h-4 shrink-0" />
          <span className="font-mono font-bold truncate">{displayTime}</span>
        </div>
      </div>
    );
  }

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className={`space-y-1.5 ${className}`} ref={dropdownRef}>
      {label && <p className="text-xs font-medium text-slate-600">{label}</p>}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`${triggerBase} bg-white flex items-center justify-between gap-2 transition-all text-left ${
          isOpen
            ? "border-orange-500 ring-2 ring-orange-200"
            : "hover:border-orange-300"
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Clock className={`w-4 h-4 shrink-0 ${isOpen ? "text-orange-600" : "text-slate-400"}`} />
          <span className={`font-mono font-bold truncate ${value ? "text-slate-900" : "text-slate-400"}`}>
            {displayTime}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="relative">
          <div className="absolute left-0 top-full mt-1 z-50 p-3 bg-white border border-slate-200 rounded-xl shadow-xl min-w-[220px]">
            <div className="flex items-center justify-center gap-3">
              <MiniSelect
                value={tempHour}
                options={hourOptions}
                onChange={setTempHour}
                label="Jam"
              />

              <span className="text-xl font-bold text-slate-300 mt-4">:</span>

              <MiniSelect
                value={tempMinute}
                options={minuteOptions}
                onChange={setTempMinute}
                label="Menit"
              />
            </div>

            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
              <button
                onClick={handleCancel}
                className="flex-1 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-lg transition-all shadow-md"
              >
                Pilih Waktu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeInput24;
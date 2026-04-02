import RSuiteDateRangePicker from "rsuite/DateRangePicker";
import "rsuite/DateRangePicker/styles/index.css";

export interface DatePreset {
  label: string;
  getDates: () => [Date, Date];
}

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (range: { start: Date | null; end: Date | null }) => void;
  presets?: DatePreset[];
  className?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  presets = [],
  className = "",
}: DateRangePickerProps) {
  const value: [Date, Date] | null =
    startDate && endDate ? [startDate, endDate] : null;

  const ranges = presets.map((p) => ({
    label: p.label,
    value: p.getDates() as [Date, Date],
  }));

  return (
    <RSuiteDateRangePicker
      value={value}
      onChange={(val) => {
        if (val) {
          onChange({ start: val[0], end: val[1] });
        } else {
          onChange({ start: null, end: null });
        }
      }}
      onClean={() => onChange({ start: null, end: null })}
      ranges={ranges}
      placement="bottomEnd"
      showOneCalendar={typeof window !== "undefined" && window.innerWidth < 640}
      character=" — "
      cleanable
      placeholder="Select date range"
      format="MMM dd, yyyy"
      className={`drp-rsuite ${className}`}
      style={{ minWidth: 210 }}
    />
  );
}

export interface QuickDateSelectorProps {
  date: string;
  disabled: boolean;
  onToday: () => void;
  onYesterday: () => void;
  onChangeDate: (value: string) => void;
}

export function QuickDateSelector({ date, disabled, onToday, onYesterday, onChangeDate }: QuickDateSelectorProps) {
  return (
    <div className="date-inline-row" aria-label="Quick date actions">
      <button type="button" className="chip" disabled={disabled} onClick={onToday}>
        Today
      </button>
      <button type="button" className="chip" disabled={disabled} onClick={onYesterday}>
        Yesterday
      </button>
      <input
        aria-label="Date"
        type="date"
        value={date}
        onChange={(event) => onChangeDate(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

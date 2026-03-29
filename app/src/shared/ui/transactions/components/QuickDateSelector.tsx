export type QuickDateSelectorRequired = {
  date: string;
  disabled: boolean;
};

export type QuickDateSelectorProvided = {
  onToday: () => void;
  onYesterday: () => void;
  onChangeDate: (value: string) => void;
};

export type QuickDateSelectorProps = {
  required: QuickDateSelectorRequired;
  provided: QuickDateSelectorProvided;
};

export function QuickDateSelector({ required, provided }: QuickDateSelectorProps) {
  return (
    <div className="date-inline-row" aria-label="Quick date actions">
      <button type="button" className="chip" disabled={required.disabled} onClick={provided.onToday}>
        Today
      </button>
      <button type="button" className="chip" disabled={required.disabled} onClick={provided.onYesterday}>
        Yesterday
      </button>
      <input
        aria-label="Date"
        type="date"
        value={required.date}
        onChange={(event) => provided.onChangeDate(event.target.value)}
        disabled={required.disabled}
      />
    </div>
  );
}

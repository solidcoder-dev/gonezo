export type AnalyticsPeriodNavigatorProps = {
  label: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export type AnalyticsPeriodNavigationViewModel = {
  currentWindowLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  goPrevious: () => void;
  goNext: () => void;
};

export function AnalyticsPeriodNavigator({ label, canGoPrevious, canGoNext, onPrevious, onNext }: AnalyticsPeriodNavigatorProps) {
  const navigable = canGoPrevious || canGoNext;
  return (
    <div className="d-flex align-items-center justify-content-between" aria-label="Analytics period">
      {navigable ? <button type="button" className="btn p-0 border-0 bg-transparent" style={{ width: 44, height: 44 }} aria-label="Previous period" disabled={!canGoPrevious} onClick={onPrevious}>
        <i className="bi bi-chevron-left" aria-hidden />
      </button> : <span aria-hidden style={{ width: 44, height: 44 }} />}
      <span className="type-metadata text-center flex-grow-1" aria-live="polite">{label}</span>
      {navigable ? <button type="button" className="btn p-0 border-0 bg-transparent" style={{ width: 44, height: 44 }} aria-label="Next period" disabled={!canGoNext} onClick={onNext}>
        <i className="bi bi-chevron-right" aria-hidden />
      </button> : <span aria-hidden style={{ width: 44, height: 44 }} />}
    </div>
  );
}

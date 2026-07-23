import type { MonthlyTimelineItemViewModel } from '../../application/monthlyMovementsTimeline';

type MonthlyTimelineRowViewProps = {
  item: MonthlyTimelineItemViewModel;
  disabled: boolean;
  onSelect: () => void;
};

export function MonthlyTimelineRowView({ item, disabled, onSelect }: MonthlyTimelineRowViewProps) {
  return (
    <li className={`monthly-timeline-row${item.ignored ? ' monthly-timeline-row--ignored' : ''}`}>
      <button
        type="button"
        className="monthly-timeline-row__button"
        onClick={onSelect}
        disabled={disabled}
        aria-label={`${item.title}, ${item.amountSign}${item.amountLabel}, ${item.metadata.join(' · ')}`}
      >
        <span
          className={`monthly-timeline-row__icon monthly-timeline-row__icon--${item.icon.tone}`}
          role="img"
          aria-label={item.icon.accessibleLabel}
        >
          <i className={item.icon.className} />
        </span>
        <span className="monthly-timeline-row__content">
          <span className="monthly-timeline-row__primary">
            <strong className="monthly-timeline-row__title">{item.title}</strong>
            <strong className={`monthly-timeline-row__amount monthly-timeline-row__amount--${item.direction}`}>
              {item.amountSign}{item.amountLabel}
            </strong>
          </span>
          <span className="monthly-timeline-row__metadata">{item.metadata.join(' · ')}</span>
        </span>
      </button>
    </li>
  );
}

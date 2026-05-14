import type { ReactNode } from 'react';
import type { ViewProps } from '../../shared/ui/ViewProps';

export type MovementRowDetailView = string | {
  key: string;
  value: ReactNode;
  primary?: boolean;
};

export type MovementRowDataView = {
  itemClassName: string;
  iconClassName: string;
  title: string;
  amount: {
    sign?: ReactNode;
    label: string;
    className?: string;
  };
  details: MovementRowDetailView[];
};

export type MovementRowViewProps = ViewProps<
  Record<string, never>,
  MovementRowDataView,
  Record<string, never>,
  {
    disabled?: boolean;
  },
  {
    select: () => void;
  }
>;

function isSegmentedDetail(detail: MovementRowDetailView): detail is Exclude<MovementRowDetailView, string> {
  return typeof detail !== 'string';
}

function renderDetails(details: MovementRowDetailView[]) {
  if (details.every((detail) => typeof detail === 'string')) {
    return details.join(' · ');
  }

  return details.map((detail, index) => {
    const segment = isSegmentedDetail(detail)
      ? detail
      : { key: `${index}-${detail}`, value: detail };
    return (
      <span key={segment.key} className="compact-meta-part">
        {index > 0 ? <span className="compact-meta-separator"> · </span> : null}
        {segment.primary ? <strong className="compact-account-name">{segment.value}</strong> : segment.value}
      </span>
    );
  });
}

export function MovementRowView({ required, provided }: MovementRowViewProps) {
  const { data, status } = required;

  return (
    <li className={`${data.itemClassName} expense-item--compact`}>
      <button
        type="button"
        className="expense-item-button expense-item-button--compact"
        onClick={provided.commands.select}
        disabled={status.disabled}
      >
        <div className="expense-top-row compact-row">
          <div className="tx-head compact-main">
            <i className={data.iconClassName} aria-hidden />
            <strong className="compact-title">{data.title}</strong>
          </div>
          <strong className={data.amount.className}>
            {data.amount.sign}
            {data.amount.label}
          </strong>
        </div>
        <div className="expense-bottom-row compact-row">
          <span className="hint compact-subline">{renderDetails(data.details)}</span>
        </div>
      </button>
    </li>
  );
}

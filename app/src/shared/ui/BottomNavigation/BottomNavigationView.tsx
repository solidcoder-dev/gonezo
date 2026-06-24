import type { BottomNavigationViewProps } from './BottomNavigationView.contract';
import './BottomNavigationView.css';

export type { BottomNavigationViewProps } from './BottomNavigationView.contract';

export function BottomNavigationView({ required, provided }: BottomNavigationViewProps) {
  return (
    <nav className="bottom-navigation" aria-label={required.config.ariaLabel}>
      {required.data.items.map((item) => {
        const isActive = item.id === required.state.activeItemId;
        const className = [
          'bottom-navigation-item',
          item.id === 'add' ? 'bottom-navigation-item--primary' : '',
          isActive ? 'bottom-navigation-item--active' : '',
        ].filter(Boolean).join(' ');

        return (
          <button
            key={item.id}
            type="button"
            className={className}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            disabled={required.status.disabled}
            onClick={() => provided.commands.select(item.id)}
          >
            <i className={item.iconClassName} aria-hidden />
            <span>{item.id === 'analytics' ? 'Stats' : item.label === 'Add movement' ? '' : item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

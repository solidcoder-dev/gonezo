import { SegmentedControlView } from '../../../shared/ui/SegmentedControlView';
import type { ViewProps } from '../../../shared/ui/ViewProps';

export type SchedulingModeView = 'now' | 'scheduled';
export type SchedulingKindView = 'one_shot' | 'recurring';

export type SchedulingOptionsViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  {
    schedulingMode: SchedulingModeView;
    schedulingKind: SchedulingKindView;
    scheduledMovementVisible: boolean;
  },
  {
    disabled?: boolean;
  },
  {
    setSchedulingMode: (value: SchedulingModeView) => void;
    setSchedulingKind: (value: SchedulingKindView) => void;
  }
>;

export function SchedulingOptionsView({ required, provided }: SchedulingOptionsViewProps) {
  const { state, status } = required;

  return (
    <div className="stack item-editor">
      <span className="hint">When should this movement be applied?</span>
      <SegmentedControlView<SchedulingModeView>
        required={{
          config: { ariaLabel: 'Movement timing', columns: 2 },
          data: {
            options: [
              { value: 'now', label: 'Now' },
              { value: 'scheduled', label: 'Schedule' },
            ],
          },
          state: { value: state.schedulingMode },
          status: { disabled: status.disabled },
        }}
        provided={{ commands: { select: provided.commands.setSchedulingMode } }}
      />

      {state.scheduledMovementVisible ? (
        <SegmentedControlView<SchedulingKindView>
          required={{
            config: { ariaLabel: 'Schedule type', columns: 2 },
            data: {
              options: [
                { value: 'one_shot', label: 'One-time' },
                { value: 'recurring', label: 'Recurring' },
              ],
            },
            state: { value: state.schedulingKind },
            status: { disabled: status.disabled },
          }}
          provided={{ commands: { select: provided.commands.setSchedulingKind } }}
        />
      ) : null}
    </div>
  );
}

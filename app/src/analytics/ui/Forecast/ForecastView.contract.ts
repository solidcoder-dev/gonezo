import type { AmountVisibility } from '../../../shared/domain/amountVisibility';
import type { FlowViewModel } from '../../application/flowPresenters';

export type ForecastViewProps = { required: { report?: FlowViewModel; status: { loading: boolean; error?: string; amountVisibility?: AmountVisibility } }; provided: { state: { canPrevious: boolean; canNext: boolean }; commands: { previous: () => void; next: () => void } } };

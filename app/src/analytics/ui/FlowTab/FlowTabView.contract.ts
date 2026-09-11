import type { FlowViewModel } from '../../application/flowPresenters';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';
export type FlowTabViewProps = { required: { report?: FlowViewModel; status: { loading: boolean; error?: string; amountVisibility?: AmountVisibility } }; provided: { state: { canPrevious: boolean; canNext: boolean }; commands: { previous: () => void; next: () => void } } };

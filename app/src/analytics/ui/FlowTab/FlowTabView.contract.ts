import type { FlowViewModel } from '../../application/flowPresenters';
export type FlowTabViewProps = { required: { report?: FlowViewModel; status: { loading: boolean; error?: string } }; provided: { state: { canPrevious: boolean; canNext: boolean }; commands: { previous: () => void; next: () => void } } };

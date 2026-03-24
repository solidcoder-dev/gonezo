type ToastSlice = {
  toastMessage: string;
  toastActionLabel: string;
  clearToast: () => void;
  runToastAction: () => void;
};

export function useToast<T extends ToastSlice>(model: T): ToastSlice {
  return {
    toastMessage: model.toastMessage,
    toastActionLabel: model.toastActionLabel,
    clearToast: model.clearToast,
    runToastAction: model.runToastAction,
  };
}

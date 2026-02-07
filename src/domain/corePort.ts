export type CoreResult = {
  status: 'ok' | 'error';
  message: string;
};

export interface CorePort {
  doThing(input: string): Promise<CoreResult>;
}

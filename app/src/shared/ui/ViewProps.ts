export type ViewProps<
  Config = Record<string, never>,
  Data = Record<string, never>,
  State = Record<string, never>,
  Status = Record<string, never>,
  Commands = Record<string, never>,
  Events = Record<string, never>,
> = {
  required: {
    config: Config;
    data: Data;
    state: State;
    status: Status;
  };
  provided: {
    commands: Commands;
    events?: Events;
  };
};

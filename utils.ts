import { createDefine } from "fresh";

export interface State {
  // Reserved for shared request state.
}

export const define = createDefine<State>();

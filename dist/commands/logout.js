import clear from "/commands/clear.js";
import { dialer } from "/utils/screens.js";

const output = [" ", "Logging out...", " "];

export { output };
export default () => {
  clear();
  return dialer();
};

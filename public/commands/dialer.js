import clear from "/commands/clear.js";
import { dialer } from "/utils/screens.js";

export default async () => {
  clear();
  return dialer();
};

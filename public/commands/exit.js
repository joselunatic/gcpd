import clear from "/commands/clear.js";

export default async () => {
  clear();
  try {
    const screens = await import("/utils/screens.js");
    window.EXIT_TO_DIALER = true;
    if (screens?.dialer) {
      screens.dialer();
    }
  } catch (error) {
    console.error("Failed to return to dialer:", error);
  }
};

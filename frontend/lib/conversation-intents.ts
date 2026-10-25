/**
 * Narrow, explicitly grounded small-talk detection.
 * These rules run before classification so a greeting cannot be mislabeled
 * as a mental-health category by an uncertain model.
 */
export type SocialOpening = "greeting" | "checkin";

export function recognizeSocialOpening(input: string): SocialOpening | null {
  const text = input
    .toLowerCase()
    .trim()
    .replace(/[!?.。,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const salutation = "(?:h+i+|h+e+l+o+|h+e+y+|h+a+l+o+|h+a+i+|selamat (?:pagi|siang|sore|malam))";
  const greeting = new RegExp(`^${salutation}(?: (?:there|kak|semua))?$`, "i");
  const checkin = "(?:how (?:are|r) (?:you|u)|how(?:'s| is) it going|how are you doing|apa kabar|gimana kabarmu|kabar kamu gimana)";
  const checkinOnly = new RegExp(`^(?:${salutation}[,!]?[ ]+)?${checkin}(?: (?:today|hari ini))?$`, "i");

  if (checkinOnly.test(text)) return "checkin";
  if (greeting.test(text)) return "greeting";
  return null;
}

export function isIndonesianOpening(input: string): boolean {
  return /\b(?:halo+|hai+|apa kabar|gimana kabarmu|kabar kamu gimana|selamat (?:pagi|siang|sore|malam))\b/i.test(input);
}

export function socialOpeningReply(input: string): string | null {
  const opening = recognizeSocialOpening(input);
  if (!opening) return null;

  const indonesian = isIndonesianOpening(input);
  if (opening === "checkin") {
    return indonesian
      ? "Hai! Makasih sudah menyapa. Aku siap mendengarkan cerita kamu. Gimana harimu sejauh ini?"
      : "Hey! Thanks for checking in. I'm here and ready to listen. How has your day been?";
  }
  return indonesian
    ? "Halo! Senang kamu mampir. Lagi ada hal yang ingin kamu ceritakan hari ini?"
    : "Hi there! Glad you stopped by. Is there anything on your mind you'd like to share?";
}

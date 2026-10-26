/**
 * MindCare response routing — transparent, offline, non-clinical.
 *
 * This module does NOT diagnose or provide treatment. The Bi-LSTM remains a
 * separate academic classifier. Intent rules are conservative: when a message
 * is ambiguous, ask the person to clarify rather than guess a disorder.
 * No messages leave the device.
 */
import type { ChatTurn } from "./types";
import { createGuidedSupport, positiveCheckinReply } from "./guided-support";
import { socialOpeningReply } from "./conversation-intents";

export type IntentRoute = {
  response: string;
  method: "social" | "guided" | "support" | "clarify";
  topic?: string;
};

const idWords = /\b(aku|saya|gue|gw|kamu|tolong|bantu|nggak|enggak|gak|tidak|kenapa|bagaimana|gimana|harus|sudah|udah|makasih|terima kasih|cemas|sedih|perasaan|pikiran|stres|takut|konselor|psikolog|dokter)\b/i;
const languageOf = (text: string, previous = "") => idWords.test(text) || (text.trim().split(/\s+/).length <= 6 && idWords.test(previous)) ? "id" : "en";

const correction = /\b(kamu (?:salah|keliru)|bukan itu(?: maksudku)?|jawaban(?:mu)? (?:nggak|gak|tidak) nyambung|nggak nyambung|gak nyambung|you (?:got it wrong|misunderstood)|that's not what i meant|not what i meant|that doesn't answer|you are not listening)\b/i;
const listening = /\b(jangan (?:kasih|beri|ngasih) (?:saran|solusi)|cuma (?:mau|pengen|ingin) (?:cerita|curhat|didengerin)|aku (?:mau|pengen|ingin) (?:curhat|cerita aja|didengar)|just (?:want|need) (?:to vent|someone to listen|you to listen)|don't (?:give|want) advice|no advice)\b/i;
const thanks = /^(?:terima kasih|makasih|makasi|thanks|thank you|thx)(?:\s+(?:ya|banget|so much|a lot))?[.! ]*$/i;
const existingDiagnosis = /\b(?:(?:aku|saya|gue|gw) (?:sudah |pernah )?(?:didiagnosis|dinyatakan) (?:mengalami |dengan )?(?:depresi|gangguan kecemasan|bipolar|gangguan makan)|i (?:was|have been|am) diagnosed with (?:depression|anxiety|bipolar disorder|an eating disorder))\b/i;
const careTrouble = /\b(?:(?:my|the) (?:therapy|counseling|treatment) (?:isn't|is not|hasn't been|doesn't seem to be) (?:working|helping)|(?:terapi|konseling|pengobatan) (?:belum|gak|nggak|tidak) (?:membantu|berhasil))\b/i;
const diagnosisRequest = /\b(apakah aku (?:punya|mengalami|kena|terkena|mengidap)|apa aku (?:depresi|bipolar|anxiety|gangguan)|diagnos(?:e|is|ed)|do i have|am i (?:depressed|bipolar)|is this (?:depression|anxiety|a disorder)|what (?:disorder|illness) do i have|gangguan mental apa)\b/i;
const treatmentRequest = /\b(?:(?:cara|bagaimana cara) (?:mengobati|menangani|mengatasi) (?:depresi|cemas|anxiety|stres|gangguan mental|gangguan makan|kecanduan)|(?:obat|pengobatan|terapi|penanganan) (?:untuk|buat) (?:depresi|cemas|anxiety|stres|gangguan mental|gangguan makan|kecanduan)|(?:how to treat|treatment for|how is) (?:depression|anxiety|panic|eating disorder|mental illness|addiction)|can (?:depression|anxiety|bipolar|mental illness) be treated)\b/i;
const askHelp = /\b(tolong|bantu|butuh saran|kasih solusi|berikan solusi|apa yang harus|harus gimana|gimana caranya|what should i do|need advice|any advice|help me|can you help|how can i cope)\b/i;
const rejectSuggestion = /\b(udah|sudah|telah|already|i tried|i've tried|didn't work|doesn't work|didn't help|gak membantu|nggak membantu|tidak membantu|masih sulit|belum berhasil)\b/i;
const greetingsOnly = /^(?:iya|ya|oke|ok|okay|yes|sure|baik|lanjut|tell me more|go on|terus|next)[!?.\s]*$/i;
const simpleEmotion = /^(?:(?:aku|saya|gue|gw)(?:\s+(?:merasa|lagi))?\s+|i(?:'m| am| feel)?\s+|i'm feeling\s+|i am feeling\s+)?(?:capek|lelah|sedih|takut|cemas|bingung|marah|kesal|bosan|tired|sad|upset|afraid|confused|exhausted|fine|okay|not okay)(?:\s+(?:banget|sekali|hari ini|today|lately|right now))?[.! ]*$/i;
const generalKnowledge = /^(?:what is (?:python|machine learning|the capital|the weather|an algorithm)|who is the |berapa (?:ibukota|hasil|cuaca)|apa (?:itu python|ibu kota)|write (?:code|a program)|buatkan (?:kode|program))\b/i;
const positiveOrdinary = /^(?:i (?:love|like) (?:food|music|movies|my family)|i slept well|today i (?:went to|had|visited)|aku (?:suka|senang) (?:makanan|musik|film)|aku tidur nyenyak|hari ini aku (?:pergi|makan|belajar))\b/i;
const explicitUncertainty = /\b(aku (?:bingung|tidak tahu) harus|i don't know what to do|aku butuh bantuan|i need help)\b/i;

// Recognize symptom topics without using their label as a diagnosis.
const contextWord = /\b(depresi|depression|cemas|anxiety|stres|stress|bipolar|panic|panik|sedih|murung|burnout|insomnia|gangguan mental|mental health|kesehatan mental|eating disorder|gangguan makan|addiction|kecanduan)\b/i;
const personalDistress = /\b(aku|saya|gue|gw|my|i|i'm|i've|me|merasa|lagi|mengalami)\b/i;

function recentUserMessages(history: ChatTurn[]): string[] {
  return history.filter((turn) => turn.role === "user" && typeof turn.content === "string")
    .slice(-5).map((turn) => turn.content.slice(0, 1200));
}

function precedingText(history: ChatTurn[]): string {
  return recentUserMessages(history).slice(-2).reverse().find(Boolean) || "";
}

/**
 * Reply immediately only to high-precision conversation acts.
 * The safety gate in browser-inference.ts runs BEFORE this function.
 */
export function routeConversation(
  message: string,
  history: ChatTurn[] = [],
  lastResponse?: string,
): IntentRoute | null {
  const current = message.trim();
  if (!current) return null;
  const previous = precedingText(history);
  const id = languageOf(current, previous) === "id";

  // Disambiguation and consent to advice take priority over keyword matching.
  if (correction.test(current)) {
    return {
      method: "clarify",
      topic: "Repairing a misunderstanding",
      response: id
        ? "Maaf, tanggapanku tadi kurang tepat. Aku tidak akan menebak-nebak kondisi kamu. Bagian mana yang salah kupahami? Aku akan fokus pada penjelasanmu."
        : "Sorry, I misunderstood your situation. I won't guess what you're going through. Which part did I get wrong? I'll focus on your explanation.",
    };
  }
  if (listening.test(current)) {
    return {
      method: "support", topic: "Listening preference",
      response: id
        ? "Boleh. Aku akan mendengarkan tanpa buru-buru memberi solusi. Apa yang paling ingin kamu ceritakan?"
        : "Of course. I'll listen without rushing into advice. What's the main thing you'd like to share?",
    };
  }

  if (diagnosisRequest.test(current)) {
    return {
      method: "support", topic: "Understanding mental health",
      response: id
        ? "Aku tidak bisa menentukan diagnosis lewat chat atau skor Bi-LSTM. Kalau gejalanya menetap atau mengganggu aktivitas, psikolog atau dokter dapat membantu menilai situasinya. Kamu bisa mulai dengan mencatat kapan perasaan itu muncul, seberapa sering, dan dampaknya pada keseharian. Mau ceritakan yang paling mengganggu?"
        : "I can't diagnose a condition from chat messages or a Bi-LSTM score. If symptoms persist or affect daily life, a qualified mental-health professional can assess what's happening. You could note when the feelings started, how often they occur, and how daily life is affected. What concerns you most?",
    };
  }
  if (existingDiagnosis.test(current)) {
    return {
      method: "support", topic: "Living with a diagnosed condition",
      response: id
        ? "Terima kasih sudah berbagi hal itu. Diagnosis sebaiknya ditangani bersama profesional yang mengenal kondisimu. Jika sudah punya rencana perawatan, kamu bisa membicarakan perubahan gejala, kesulitan, atau pertanyaan yang muncul dengan tenaga kesehatan yang menangani. Kamu ingin membahas dukungan sehari-hari, atau cara menyampaikan kekhawatiran pada profesional?"
        : "Thank you for sharing that. A diagnosed condition is best managed together with a qualified professional who knows your situation. If you already have a care plan, you can discuss changes, concerns, or difficulties with them. Would you rather talk about everyday support or how to raise concerns with your clinician?",
    };
  }
  if (careTrouble.test(current)) {
    return {
      method: "support", topic: "Reviewing existing support",
      response: id
        ? "Kalau dukungan yang sedang dijalani belum terasa membantu, itu layak dibicarakan dengan profesional yang menanganimu agar pendekatannya bisa dievaluasi. Jangan mengubah pengobatan sendiri berdasarkan saran chatbot. Apa bagian yang belum sesuai dengan kebutuhanmu?"
        : "If the support you're receiving doesn't seem helpful, tell your treating professional so they can review the approach with you. Don't change prescribed care based on a chatbot. What part hasn't been meeting your needs?",
    };
  }
  if (treatmentRequest.test(current)) {
    return {
      method: "support", topic: "Professional treatment information",
      response: id
        ? "Kesulitan kesehatan mental punya berbagai bentuk penanganan, bergantung pada kebutuhan masing-masing. Bantuan profesional dapat melibatkan konseling atau terapi psikologis, dan untuk sebagian kondisi dokter dapat mempertimbangkan perawatan medis. MindCare tidak dapat memilih pengobatan atau menentukan diagnosis. Jika kamu atau seseorang sedang kesulitan, langkah awalnya bisa berbicara dengan psikolog, dokter, atau orang dewasa tepercaya. Kamu ingin memahami pilihan bantuan, atau butuh cara mencari layanan?"
        : "Mental-health difficulties can be helped in different ways depending on individual needs. Professional care may include counselling or psychological therapy, and sometimes medical care assessed by a clinician. MindCare cannot select treatment or diagnose you. A useful starting point is speaking with a qualified professional or trusted adult. Would you like to understand the options or find a way to seek support?",
    };
  }

  const social = socialOpeningReply(current) || positiveCheckinReply(current);
  if (social) return { method: "social", response: social };

  if (generalKnowledge.test(current)) {
    return { method: "clarify", topic: "Out of scope", response: id
      ? "MindCare lebih cocok untuk membahas perasaan dan situasi yang kamu hadapi, bukan menjawab pertanyaan pengetahuan umum. Ada hal yang ingin kamu ceritakan?"
      : "MindCare is designed for emotional reflection, not general-knowledge questions. Is there something you'd like to talk through?" };
  }
  if (positiveOrdinary.test(current)) {
    return { method: "social", topic: "Everyday conversation", response: id
      ? "Oh, menarik! Mau cerita sedikit tentang harimu atau ada hal tertentu yang lagi kamu pikirkan?"
      : "That sounds nice! Would you like to share a little more about your day?" };
  }

  if (thanks.test(current)) {
    return { method: "social", response: id
      ? "Sama-sama. Semoga langkah kecil tadi membantu. Kalau belum sesuai, kita bisa cari cara lain."
      : "You're welcome. I hope that small step helps. If it doesn't fit, we can consider another approach." };
  }

  if (greetingsOnly.test(current)) {
    // Do not fabricate prior conversation if context does not exist.
    return { method: "clarify", response: previous
      ? (id
        ? "Oke, aku dengar. Bagian mana yang ingin kamu lanjutkan atau bahas lebih dalam?"
        : "Okay, I'm listening. Which part would you like to explore next?")
      : (id
        ? "Boleh. Apa yang ingin kamu ceritakan atau tanyakan?"
        : "Sure. What would you like to talk about?") };
  }

  // A user's stated preference overrides a previously inferred topic.
  if (simpleEmotion.test(current) && !askHelp.test(current)) {
    return {
      method: "support", topic: "Emotional check-in",
      response: id
        ? "Makasih sudah bilang. Aku tidak akan langsung menyimpulkan penyebabnya. Kamu mau cerita apa yang membuatmu merasa begitu, atau lebih nyaman kalau aku bantu cari satu langkah kecil?"
        : "Thanks for telling me. I won't jump to conclusions about why you feel this way. Would you rather tell me what happened or explore one small next step?",
    };
  }

  // If there is a clear current issue or short follow-up, use the curated
  // situation-specific guidance (see guided-support.ts).
  const guided = createGuidedSupport(current, history, lastResponse);
  if (guided) return { method: "guided", topic: guided.topic, response: guided.response };

  // Respond to requests for help only if the topic is clear; otherwise ask
  // one informative question. A neural category alone is insufficient.
  if (askHelp.test(current) || explicitUncertainty.test(current) ||
      (rejectSuggestion.test(current) && previous)) {
    return {
      method: "clarify", topic: "Needs clarification",
      response: id
        ? "Aku ingin bantu dengan langkah yang sesuai, bukan saran asal. Situasi apa yang paling ingin kamu atasi sekarang? Kamu bisa ceritakan singkat saja."
        : "I'd like to offer a relevant next step instead of guessing. What's the main situation you'd like help with? A short description is enough.",
    };
  }

  // Avoid a diagnostic category assignment from standalone health keywords.
  if (contextWord.test(current) && !personalDistress.test(current)) {
    return {
      method: "clarify", topic: "Mental-health information",
      response: id
        ? "Kamu ingin tahu informasi umum tentang topik itu, atau sedang mengalami sesuatu yang ingin diceritakan? Aku bisa menjelaskan secara umum, tetapi tidak mendiagnosis."
        : "Would you like general information about that topic, or are you describing something you're experiencing? I can explain it generally, but I can't diagnose.",
    };
  }
  return null;
}

export function unclearMessageReply(message: string): string {
  return languageOf(message) === "id"
    ? "Aku belum cukup memahami situasinya untuk memberi saran yang tepat. Bisa ceritakan satu hal yang terjadi atau perasaan yang paling mengganggu? Aku akan menghindari asumsi tentang kondisi kesehatanmu."
    : "I don't have enough context to suggest something useful. Could you describe one thing that happened or the feeling that's bothering you most? I won't assume a diagnosis.";
}

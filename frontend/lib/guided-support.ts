/**
 * Guided supportive conversations, not therapy or a diagnostic engine.
 *
 * Uses tightly scoped bilingual topic matching to make the next reply useful.
 * Small, optional steps draw on everyday coping practices (WHO / UNICEF).
 * No LLM, API key, user-data upload or medical-treatment recommendations.
 */
import type { ChatTurn } from "./types";

type TopicKey =
  | "interview" | "exam" | "workload" | "family" | "friendship"
  | "sleep" | "loneliness" | "grief" | "money" | "food"
  | "habits" | "low_mood" | "anxiety" | "work_stress" | "stress";

type Reply = { intro: string; first: string; alternative: string; question: string };
type TopicSpec = {
  key: TopicKey;
  title: string;
  match: RegExp;
  id: Reply;
  en: Reply;
};

const TOPICS: TopicSpec[] = [
  {
    key: "interview", title: "Interview preparation",
    match: /\b(interview|wawancara|interviu)\b/i,
    id: {
      intro: "Wawancara memang bisa bikin tegang, apalagi kalau hasilnya terasa penting.",
      first: "Coba tulis tiga hal: perkenalan singkat, satu contoh proyek yang kamu pahami, dan satu pertanyaan untuk pewawancara. Latih jawabannya dengan suara pelan selama beberapa menit.",
      alternative: "Kalau sudah latihan tapi masih gugup, coba fokus pada satu jawaban pembuka saja. Kamu tidak harus menghafal semuanya; cukup siapkan poin utamanya.",
      question: "Bagian wawancara mana yang paling bikin khawatir: perkenalan, pertanyaan teknis, atau pengalaman sebelumnya?",
    },
    en: {
      intro: "Interviews can be stressful, especially when the result feels important.",
      first: "Try preparing three things: a short introduction, one project example you understand well, and one question to ask the interviewer. Practise saying them aloud for a few minutes.",
      alternative: "If you've practised and still feel nervous, focus on one opening answer rather than memorising everything. A few key points are enough.",
      question: "Which part feels hardest: introductions, technical questions, or a past interview experience?",
    },
  },
  {
    key: "exam", title: "School and exam stress",
    match: /\b(exams?|tests?|quizzes?|ujian|kuis|ulangan|uts|uas|pr\b|homework|tugas sekolah)\b/i,
    id: {
      intro: "Tekanan menjelang ujian bisa terasa berat, terutama saat banyak materi belum selesai.",
      first: "Pilih satu topik yang paling perlu dipelajari, lalu kerjakan satu sesi singkat dengan contoh soal. Setelah itu cek bagian mana yang belum kamu pahami, bukan sekadar membaca semuanya berulang.",
      alternative: "Kalau cara tadi sudah dicoba, coba jelaskan satu konsep dengan kata-katamu sendiri atau minta teman membantu menguji pemahamanmu.",
      question: "Mata pelajaran atau bagian materi apa yang paling sulit sekarang?",
    },
    en: {
      intro: "Exam pressure can feel intense when there is a lot left to cover.",
      first: "Choose just one priority topic and try a short session with a practice question. Then identify what you still don't understand instead of rereading everything.",
      alternative: "If that hasn't helped, try explaining one idea in your own words or asking a classmate to quiz you.",
      question: "Which subject or topic feels hardest right now?",
    },
  },
  {
    key: "workload", title: "Overwhelm and workload",
    match: /\b(deadlines?|assignments?|overwhelmed|burn(?:ed|t)?\s*out|too much work|banyak tugas|tugas numpuk|keteteran|kewalahan|burnout)\b/i,
    id: {
      intro: "Kalau banyak hal datang bersamaan, wajar kalau sulit menentukan harus mulai dari mana.",
      first: "Tulis semua tugas, lalu tandai satu yang paling dekat tenggat atau paling penting. Pecah menjadi langkah pertama yang bisa dikerjakan sekitar sepuluh menit.",
      alternative: "Kalau daftar tugas malah bikin makin penuh, pilih satu hal yang bisa ditunda atau minta bantuan untuk membagi bebannya.",
      question: "Apa satu tugas yang paling mendesak hari ini?",
    },
    en: {
      intro: "When several responsibilities pile up, deciding where to begin can be difficult.",
      first: "Write down what needs doing, choose the most urgent item, and break it into a first step that takes roughly ten minutes.",
      alternative: "If making a list feels overwhelming, look for one thing you can postpone or ask someone to help you share the load.",
      question: "What is the most urgent thing on your list today?",
    },
  },
  {
    key: "family", title: "Family tension",
    match: /\b(family|parents?|mother|father|siblings?|keluarga|orang tua|ayah|ibu|kakak|adik|rumah.*ribut)\b/i,
    id: {
      intro: "Ketegangan dengan keluarga bisa terasa melelahkan, apalagi kalau sulit didengar.",
      first: "Kalau situasinya aman, pilih waktu yang lebih tenang dan jelaskan satu hal yang kamu rasakan memakai kalimat 'aku merasa... ketika...'. Tidak harus menyelesaikan semuanya sekaligus.",
      alternative: "Kalau percakapan langsung belum membantu, kamu bisa menulis apa yang ingin disampaikan lebih dulu atau mengajak orang dewasa tepercaya menjadi pendamping.",
      question: "Kamu lebih ingin didengarkan dulu atau mencari cara menyampaikan kebutuhanmu?",
    },
    en: {
      intro: "Tension at home can be exhausting, especially when you don't feel heard.",
      first: "If it's safe, choose a calmer moment and explain one feeling using 'I feel... when...'. You don't need to resolve everything at once.",
      alternative: "If talking directly hasn't helped, write down what you want to say or ask a trusted adult to help with the conversation.",
      question: "Would it help more to be heard first, or to work out what to say?",
    },
  },
  {
    key: "friendship", title: "Friendship and relationships",
    match: /\b(friends?|friendship|relationship|breakup|ignored|ditinggal|teman|sahabat|pacar|pertemanan|dikucilkan|dijauhi)\b/i,
    id: {
      intro: "Masalah dengan orang dekat bisa bikin pikiran terus berputar.",
      first: "Coba bedakan dulu apa yang benar-benar terjadi dan apa yang masih kamu khawatirkan. Kalau aman dan kamu siap, tanyakan satu hal secara langsung tanpa menyalahkan.",
      alternative: "Kalau komunikasi belum berjalan baik, ambil jeda dan cari dukungan dari teman atau orang dewasa lain yang bisa dipercaya.",
      question: "Apa yang paling ingin kamu pahami atau sampaikan ke orang itu?",
    },
    en: {
      intro: "Difficulties with someone close can leave you replaying the situation.",
      first: "Try separating what actually happened from what you're worried it might mean. If you feel safe, you can ask one direct question without blame.",
      alternative: "If talking hasn't gone well, take some space and reach out to a different trusted friend or adult for perspective.",
      question: "What would you most like to understand or communicate?",
    },
  },
  {
    key: "sleep", title: "Sleep difficulties",
    match: /\b(sleep|insomnia|can't sleep|susah tidur|tidak bisa tidur|gak bisa tidur|nggak bisa tidur|begadang|tidur)\b/i,
    id: {
      intro: "Susah tidur bisa membuat hari berikutnya terasa lebih berat.",
      first: "Kalau memungkinkan, coba buat rutinitas sebelum tidur yang menenangkan: redupkan layar dan lakukan aktivitas santai. Hindari memaksa diri harus langsung tertidur.",
      alternative: "Kalau rutinitas itu belum membantu, catat hal yang sering membuat pikiran aktif di malam hari dan bahas dengan tenaga kesehatan jika masalah tidur terus berlanjut.",
      question: "Yang paling mengganggu: sulit mulai tidur atau sering terbangun?",
    },
    en: {
      intro: "Sleep difficulties can make the next day feel harder.",
      first: "If possible, try a calming wind-down routine, dim bright screens, and do something quiet. Try not to pressure yourself to fall asleep immediately.",
      alternative: "If that hasn't helped, note what seems to keep your mind busy at night, and speak to a health professional if the difficulty persists.",
      question: "Is the main problem falling asleep or waking up during the night?",
    },
  },
  {
    key: "loneliness", title: "Loneliness",
    match: /\b(lonely|alone|isolated|no friends|kesepian|sendirian|gak punya teman|nggak punya teman|merasa sendiri)\b/i,
    id: {
      intro: "Merasa sendirian bisa berat, bahkan saat ada orang di sekitar.",
      first: "Kalau kamu nyaman, coba menghubungi satu orang yang terasa cukup aman untuk diajak bicara, meski hanya mengirim pesan sederhana.",
      alternative: "Kalau belum siap menghubungi seseorang, coba aktivitas bersama yang ringan seperti komunitas belajar atau kegiatan yang kamu sukai, tanpa harus langsung akrab.",
      question: "Kamu merasa kurang punya teman bicara, atau justru sulit merasa dekat dengan orang yang sudah ada?",
    },
    en: {
      intro: "Feeling lonely can be difficult, even when people are around.",
      first: "If you're comfortable, consider messaging one person who feels safe to talk to, even with a very simple check-in.",
      alternative: "If reaching out feels hard, a low-pressure shared activity can help you reconnect without needing to form a close friendship immediately.",
      question: "Is it more about not having someone to talk to, or not feeling understood?",
    },
  },
  {
    key: "grief", title: "Loss and grief",
    match: /\b(grief|grieving|bereavement|passed away|died|kehilangan|berduka|meninggal|ditinggal pergi)\b/i,
    id: {
      intro: "Kehilangan seseorang atau sesuatu yang berarti bisa membawa banyak perasaan yang berubah-ubah.",
      first: "Kalau kamu mau, beri ruang untuk mengenang satu hal yang penting bagimu, atau ceritakan perasaanmu ke orang yang kamu percaya. Tidak ada keharusan untuk cepat merasa lebih baik.",
      alternative: "Kalau berbicara belum terasa pas, menulis kenangan singkat atau meminta ditemani orang tepercaya juga bisa menjadi langkah kecil.",
      question: "Kamu ingin bercerita tentang yang kamu rindukan, atau tentang bagaimana melewati hari-hari ini?",
    },
    en: {
      intro: "Losing someone or something important can bring many changing emotions.",
      first: "If you want to, remember one meaningful moment or share how you're feeling with someone you trust. There's no deadline for feeling better.",
      alternative: "If talking doesn't feel right, writing a small memory or simply asking someone to keep you company can be another option.",
      question: "Would you rather talk about what you miss or about getting through the coming days?",
    },
  },
  {
    key: "money", title: "Money worries",
    match: /\b(money|rent|bills?|financial|budget|uang|biaya|keuangan|kos|dompet|bokek)\b/i,
    id: {
      intro: "Kekhawatiran soal uang bisa menyita banyak energi.",
      first: "Kalau ingin mulai dari langkah kecil, catat kebutuhan yang paling mendesak minggu ini dan pisahkan dari pengeluaran yang bisa ditunda. Kamu tidak harus menyelesaikan seluruh masalah sekaligus.",
      alternative: "Kalau sudah membuat daftar tapi masih berat, cari kemungkinan dukungan praktis dari orang tepercaya atau layanan bantuan di lingkunganmu.",
      question: "Saat ini kamu lebih khawatir soal kebutuhan mendesak atau rencana keuangan ke depan?",
    },
    en: {
      intro: "Money worries can take up a lot of mental energy.",
      first: "For a small first step, list this week's essentials and separate them from expenses that can wait. You don't need to solve everything at once.",
      alternative: "If you've already made a plan and it's still difficult, consider practical help from someone you trust or an appropriate support service.",
      question: "Is your main concern an immediate expense or planning ahead?",
    },
  },
  {
    key: "food", title: "Difficult feelings around food",
    match: /\b(eating|food guilt|guilty after eating|body image|makan|makanan|takut makan|rasa bersalah.*makan|kalori)\b/i,
    id: {
      intro: "Perasaan sulit tentang makanan atau tubuh perlu ditanggapi dengan lembut, bukan dengan menyalahkan diri.",
      first: "Kamu tidak perlu menghukum diri atau membatasi makan karena perasaan bersalah. Kalau pikiran tentang makanan mulai mengganggu keseharian, coba cerita pada orang tepercaya atau tenaga kesehatan.",
      alternative: "Kalau sudah mencoba bercerita tapi belum merasa terbantu, kamu bisa meminta dukungan dari tenaga profesional yang memahami hubungan dengan makanan.",
      question: "Apa yang paling terasa mengganggu: kekhawatiran saat makan atau perasaan sesudahnya?",
    },
    en: {
      intro: "Difficult feelings about food or your body deserve care rather than judgment.",
      first: "You don't need to punish yourself or restrict food because of guilt. If food worries interfere with daily life, consider talking to someone you trust or a health professional.",
      alternative: "If you've already talked about it and still need support, a qualified professional familiar with eating-related concerns may be helpful.",
      question: "Is the hardest part worrying before meals or how you feel afterward?",
    },
  },
  {
    key: "habits", title: "Habits and compulsive behavior",
    match: /\b(addicted|addiction|can't stop|compulsive|kecanduan|ketagihan|susah berhenti|tidak bisa berhenti|gak bisa berhenti|nggak bisa berhenti)\b/i,
    id: {
      intro: "Sulit mengubah kebiasaan bukan berarti kamu harus menghadapinya sendirian.",
      first: "Coba kenali kapan dorongan itu paling sering muncul dan pilih satu pengalih perhatian yang aman untuk dicoba. Kalau kebiasaan ini mengganggu hidupmu, minta dukungan orang tepercaya atau profesional.",
      alternative: "Kalau satu strategi belum berhasil, orang tepercaya atau konselor bisa membantu membuat rencana yang lebih sesuai dengan situasimu.",
      question: "Kapan biasanya kebiasaan itu paling sulit dikendalikan?",
    },
    en: {
      intro: "Changing a difficult habit can take support and patience.",
      first: "Notice when the urge tends to show up and choose one safe alternative activity to try. If it's disrupting everyday life, consider support from someone you trust or a professional.",
      alternative: "If you've tried that already, a trusted person or counsellor may help you make a plan that fits your situation.",
      question: "When does this habit feel hardest to manage?",
    },
  },
  {
    key: "low_mood", title: "Low mood",
    match: /\b(sad|empty|hopeless|down lately|no motivation|sedih|hampa|murung|putus asa|gak semangat|nggak semangat|kehilangan semangat)\b/i,
    id: {
      intro: "Kedengarannya akhir-akhir ini tidak mudah bagimu. Aku tidak mau buru-buru menyimpulkan apa yang kamu alami.",
      first: "Kalau kamu sanggup, pilih satu langkah ringan hari ini, misalnya melakukan aktivitas yang biasanya terasa nyaman atau menghubungi orang yang bisa mendengarkan. Kalau berlangsung lama atau mengganggu keseharian, dukungan profesional bisa membantu.",
      alternative: "Kalau hal sederhana belum membantu, coba ceritakan pada orang tepercaya bagaimana perasaan ini memengaruhi harimu, supaya kamu tidak perlu menanganinya sendiri.",
      question: "Perasaan ini lebih sering datang pada waktu tertentu, atau hampir sepanjang hari?",
    },
    en: {
      intro: "It sounds like things haven't been easy lately. I don't want to jump to conclusions about how you're feeling.",
      first: "If you're able, try one gentle activity today or reach out to someone who can listen. If this lasts or disrupts everyday life, professional support can help.",
      alternative: "If small activities haven't helped, consider telling someone you trust how these feelings are affecting your days.",
      question: "Does this feeling come at particular times or stay with you most of the day?",
    },
  },
  {
    key: "anxiety", title: "Anxiety and worry",
    match: /\b(anxious|anxiety|nervous|worried|worry|panic|panicking|cemas|khawatir|gelisah|panik|takut|deg.degan)\b/i,
    id: {
      intro: "Rasa khawatir bisa membuat pikiran terasa penuh, terutama saat belum tahu apa yang akan terjadi.",
      first: "Kalau kamu merasa nyaman, coba perhatikan napas dan lingkungan di sekitarmu sejenak, lalu tulis satu hal kecil yang benar-benar bisa kamu lakukan sekarang.",
      alternative: "Kalau menenangkan diri sebentar belum membantu, coba pisahkan hal yang bisa kamu kendalikan dari yang tidak, atau bicarakan kekhawatiran ini dengan orang tepercaya.",
      question: "Hal apa yang paling kamu khawatirkan saat ini?",
    },
    en: {
      intro: "Worry can make your thoughts feel crowded, especially when the outcome is uncertain.",
      first: "If it feels comfortable, take a moment to notice your breathing and surroundings, then write down one small action you can take now.",
      alternative: "If that hasn't helped, try separating what you can influence from what you can't, or discuss the worry with someone you trust.",
      question: "What are you most worried about right now?",
    },
  },
  {
    key: "work_stress", title: "Stress at work",
    match: /\b(work|office|boss|coworkers?|workplace|job|kerja|pekerjaan|kantor|atasan|rekan kerja)\b/i,
    id: {
      intro: "Tekanan pekerjaan bisa menguras energi, apalagi kalau banyak tuntutan datang bersamaan.",
      first: "Coba kenali satu hal dari pekerjaan yang paling membuatmu tertekan. Jika memungkinkan, tentukan batas yang realistis atau diskusikan prioritas tugas dengan orang yang tepat di tempat kerja.",
      alternative: "Kalau sudah mencoba mengatur prioritas tetapi tekanan masih berat, pertimbangkan meminta dukungan dari rekan atau atasan yang aman diajak bicara, atau berkonsultasi bila ini mengganggu keseharian.",
      question: "Tekanan paling berat berasal dari banyaknya pekerjaan, hubungan dengan rekan, atau ekspektasi atasan?",
    },
    en: {
      intro: "Work pressure can be draining when expectations pile up.",
      first: "Identify one work situation creating the most pressure. If possible, set a realistic boundary or clarify priorities with the appropriate person at work.",
      alternative: "If prioritizing hasn't helped, consider seeking support from a trusted colleague or supervisor, or professional support if this is affecting daily life.",
      question: "Is most of the pressure from workload, relationships with colleagues, or expectations?",
    },
  },
  {
    key: "stress", title: "Everyday stress",
    match: /\b(stress(?:ed)?|pressure|frustrated|stres|tertekan|beban pikiran|pusing banget|cape banget)\b/i,
    id: {
      intro: "Kedengarannya ada banyak tekanan yang sedang kamu hadapi.",
      first: "Boleh coba berhenti sebentar, amati apa yang kamu rasakan, lalu pilih satu kegiatan kecil yang paling penting untuk dilakukan berikutnya.",
      alternative: "Kalau jeda singkat tidak cukup, pertimbangkan meminta bantuan untuk satu bagian masalah atau mengambil waktu untuk aktivitas yang menenangkan.",
      question: "Tekanan itu paling terasa dari hal apa akhir-akhir ini?",
    },
    en: {
      intro: "It sounds as though you're carrying quite a lot of pressure.",
      first: "You might pause briefly, notice how you're feeling, and choose just one small next action that matters right now.",
      alternative: "If a brief pause hasn't helped, consider asking for support with one part of the problem or making time for something calming.",
      question: "Where is most of that pressure coming from?",
    },
  },
];

// Prefer the most specific situation when a sentence mentions two subjects.
// Example: "my friend passed away" is grief, NOT a friendship dispute.
const topicPriority: TopicKey[] = [
  "grief", "food", "sleep", "interview", "exam", "loneliness",
  "habits", "family", "friendship", "money", "workload",
  "work_stress", "low_mood", "anxiety", "stress",
];

function findTopic(text: string): TopicSpec | undefined {
  return TOPICS.filter((topic) => topic.match.test(text))
    .sort((a, b) => topicPriority.indexOf(a.key) - topicPriority.indexOf(b.key))[0];
}

const personalSignal = /\b(i|i'm|i've|i’m|my|me|we|aku|saya|gue|gw|ku|lagi|susah|gak|nggak|enggak|tidak|takut|besok|merasa|butuh|tolong|please|help|what should i do|gimana caranya|bagaimana caranya|harus gimana|can you help)\b/i;
const questionForHelp = /\b(what should i do|how do i cope|how can i|can you help|need help|any advice|what can i do|harus gimana|gimana caranya|bagaimana caranya|tolong|bantu|saran|cara mengatasi|solusinya)\b/i;
const followUp = /^(?:and |but |because |what should i do|what can i do|how|why|still |i tried|i've tried|i already tried|that didn't|that's not|it didn't|it doesn't|apa|gimana|bagaimana|kenapa|tapi |karena |masih |udah |sudah |aku sudah |aku udah |terus |lalu |jadi |enggak |gak |nggak )/i;
const triedAlready = /\b(i (?:already )?tried|i've tried|didn't (?:work|help)|doesn't help|still struggling|already tried|sudah coba|udah coba|telah coba|masih sulit|belum membantu|gak membantu|nggak membantu|tidak membantu)\b/i;
const idMarkers = /\b(aku|saya|gue|gw|kamu|gimana|bagaimana|kenapa|lagi|nggak|gak|enggak|tidak|banget|susah|takut|sedih|ujian|kuliah|sekolah|keluarga|teman|makan|tidur|kehilangan|harus|tolong|capek|cemas|stres|pikiran)\b/i;

export type GuidedSupport = {
  response: string;
  topic: string;
  language: "id" | "en";
};

/** Return a supportive, actionable answer only when a personal topic is clear. */
export function createGuidedSupport(
  message: string,
  history: ChatTurn[] = [],
  lastResponse?: string,
): GuidedSupport | null {
  const current = message.trim();
  if (!current || current.length > 4000) return null;

  const directlyRelevant = personalSignal.test(current) ||
    questionForHelp.test(current);
  let topic = directlyRelevant ? findTopic(current) : undefined;

  // A happy result is not a stress disclosure. Do not offer exam anxiety
  // advice when someone is celebrating passing an exam or interview.
  if (topic && (topic.key === "exam" || topic.key === "interview") &&
      /\b(passed|success|did well|went well|happy|excited|lulus|berhasil|senang|gembira)\b/i.test(current) &&
      !/\b(but|however|worried|nervous|afraid|anxious|stressed|scared|tapi|cemas|takut|khawatir|stres|gelisah)\b/i.test(current)) {
    topic = undefined;
  }

  // Mentioning ordinary activities alone is not evidence of distress. Do
  // not turn "I like food" or "I slept well" into an unsolicited intervention.
  if (topic?.key === "food" &&
      !/\b(guilty|guilt|worried|worry|anxious|scared|afraid|restrict|struggling|shame|body image|kalori|salah|bersalah|takut|cemas|khawatir|susah|kesulitan|ganggu|masalah)\b/i.test(current)) {
    topic = undefined;
  }
  if (topic?.key === "sleep" &&
      !/\b(cannot|can't|couldn't|hard|difficult|struggl|bad|poor|worry|anxious|problem|insomnia|susah|tidak|gak|nggak|enggak|sulit|sering bangun|bangun terus|ganggu|masalah|begadang)\b/i.test(current)) {
    topic = undefined;
  }

  // Use the previous user topic only for short, recognisable follow-ups.
  // A brand-new topic must never be contaminated by an old conversation.
  const priorUserMessages = history
    .filter((item) => item.role === "user" && typeof item.content === "string")
    .slice(-4).reverse().map((item) => item.content.slice(0, 600));
  const previous = priorUserMessages[0] || "";
  const explicitTopicChange = /\b(ganti topik|lain cerita|beda masalah|different issue|change the topic|another problem|new topic)\b/i.test(current);
  const mayContinue = !explicitTopicChange && current.split(/\s+/).length <= 14 && followUp.test(current);
  if (!topic && mayContinue) {
    // Locate the nearest relevant user-described situation. Assistant answers
    // are deliberately excluded to avoid carrying forward its own mistakes.
    const earlierIssue = priorUserMessages.find((text) =>
      TOPICS.some((item) => item.match.test(text))
    );
    if (earlierIssue) topic = findTopic(earlierIssue);
  }
  if (!topic) return null;

  const indonesia = idMarkers.test(current) ||
    (mayContinue && priorUserMessages.some((text) => idMarkers.test(text)));
  const reply = indonesia ? topic.id : topic.en;
  // The user has indicated the initial step did not help, or the previous
  // assistant answer already suggested it. Avoid repeating the same advice.
  const backup = triedAlready.test(current) ||
    Boolean(lastResponse && lastResponse.includes(reply.first));
  // If the first step failed or was already proposed, don't repeat the
  // exact same intro + question. Ask what was attempted instead.
  return {
    response: backup
      ? (indonesia
        ? "Kalau saran sebelumnya belum cocok, tidak perlu dipaksakan.\n\n" +
          reply.alternative + "\n\nBagian mana yang sudah kamu coba, dan apa yang masih terasa sulit?"
        : "If the earlier suggestion didn't fit, there's no need to force it.\n\n" +
          reply.alternative + "\n\nWhat have you tried, and what still feels difficult?")
      : reply.intro + "\n\n" + reply.first + "\n\n" + reply.question,
    topic: topic.title,
    language: indonesia ? "id" : "en",
  };
}


/** Controlled, non-diagnostic fallback advice when no situation is recognized. */
const generalSuggestions: Record<string, { id: [string, string]; en: [string, string] }> = {
  Anxiety: {
    id: [
      "Sepertinya ada hal yang membuatmu khawatir. Kalau nyaman, coba amati lingkungan di sekitarmu sejenak dan tulis satu hal yang bisa kamu lakukan. Apa yang paling mengganggu pikiranmu?",
      "Kalau rasa cemas masih mengganggu, coba pisahkan hal yang bisa kamu kendalikan dari yang tidak, atau cerita pada orang tepercaya. Hal apa yang ingin kamu mulai dulu?",
    ],
    en: [
      "It sounds like something may be worrying you. If comfortable, notice your surroundings and identify one thing you can do now. What's the biggest concern?",
      "If worry is still intense, try writing down what you can control or talk with someone you trust. Where would you like to start?",
    ],
  },
  Depression: {
    id: [
      "Terima kasih sudah cerita. Aku tidak bisa menyimpulkan kondisi kesehatan mental dari sebuah pesan, tetapi perasaan beratmu layak didengar. Kalau memungkinkan, pilih satu aktivitas ringan yang terasa nyaman hari ini. Apa yang paling menguras energimu?",
      "Kalau perasaan ini terus mengganggu keseharian, pertimbangkan menghubungi orang tepercaya atau tenaga profesional. Kita juga bisa mencoba menata satu masalah kecil bersama.",
    ],
    en: [
      "Thank you for opening up. I can't determine a mental-health condition from one message, but your feelings matter. If possible, choose one gentle activity today. What has been draining your energy?",
      "If these feelings persist or disrupt everyday life, consider reaching out to someone you trust or a qualified professional. We can also break down one concern.",
    ],
  },
  "Eating Disorder": {
    id: [
      "Jika pikiran tentang makanan atau tubuh membuatmu tertekan, kamu layak mendapat dukungan tanpa dihakimi. Kamu tidak perlu membatasi makan untuk menghukum diri. Apa yang paling mengganggu pikiranmu?",
      "Jika kekhawatiran tentang makanan terus terasa berat, cobalah berbicara dengan orang tepercaya atau tenaga kesehatan yang memahami masalah makan. Dukungan apa yang kamu butuhkan?",
    ],
    en: [
      "If thoughts about food or your body feel distressing, you deserve support without judgment. You don't need to restrict food as punishment. What concerns feel most difficult?",
      "If concerns around food keep affecting your days, consider talking to someone you trust or a qualified professional. What support would help you most?",
    ],
  },
  Addiction: {
    id: [
      "Mengubah kebiasaan bisa terasa sulit. Kalau kamu mau, amati kapan dorongan itu biasanya muncul dan pilih satu kegiatan alternatif yang aman. Bagian mana yang paling berat sekarang?",
      "Kalau sudah mencoba berubah tetapi masih kesulitan, dukungan orang tepercaya atau profesional bisa membantu menyusun langkah yang lebih cocok. Apa yang sudah kamu coba?",
    ],
    en: [
      "Changing a habit can feel frustrating. If you want, notice when the urge shows up and choose a safe alternative activity. Which part feels hardest?",
      "If you've tried making changes and are still struggling, support from someone you trust or a qualified professional may help. What have you tried so far?",
    ],
  },
  Neutral: {
    id: [
      "Makasih sudah bercerita. Kamu ingin membahas apa yang terjadi, atau mencari langkah berikutnya?",
      "Kalau kamu mau, kita bisa mengurai satu hal yang paling penting supaya langkah berikutnya lebih jelas.",
    ],
    en: [
      "Thanks for sharing that. Would you rather talk about what happened or work out a next step?",
      "If you'd like, tell me which part matters most and we can think through a small next step.",
    ],
  },
  OOD: {
    id: [
      "MindCare berfokus pada percakapan tentang perasaan dan kesejahteraan emosional. Kalau ada hal yang membuatmu tertekan, kamu boleh cerita lebih lanjut.",
      "Aku tidak bisa menjawab semua jenis pertanyaan, tetapi bisa membantu kamu menata apa yang sedang dipikirkan atau dirasakan.",
    ],
    en: [
      "MindCare focuses on emotional well-being rather than general factual answers. Is there a concern you'd like to talk through?",
      "I can't answer every kind of question, but I can help you reflect on how a situation is affecting you.",
    ],
  },
};

export function generalSupportForClass(
  label: string,
  userMessage: string,
  lastResponse?: string,
): string | null {
  const suggestions = generalSuggestions[label];
  if (!suggestions) return null;
  const [first, second] = idMarkers.test(userMessage) ? suggestions.id : suggestions.en;
  return lastResponse === first ? second : first;
}


/** Celebrate straightforward positive check-ins rather than medicalising them. */
export function positiveCheckinReply(message: string): string | null {
  const text = message.trim().toLowerCase().replace(/[!?.]+$/g, "").trim();
  if (/\b(but|however|although|worried|nervous|anxious|afraid|tapi|namun|takut|cemas|khawatir|stres)\b/i.test(text)) {
    return null; // Mixed emotions need their own context, not a cheerleading shortcut.
  }
  if (/^(?:aku|saya|gue|gw)\s+(?:(?:akhirnya\s+)?lulus\s+(?:ujian|tes|wawancara|interview)|(?:senang|bahagia|gembira)(?:\s+banget)?(?:\s+hari ini)?|berhasil\s+menyelesaikan\s+(?:tugas|ujian))\b/i.test(text)) {
    return "Wah, terima kasih sudah berbagi kabar baik itu! Apa bagian yang paling membuatmu senang?";
  }
  if (/^(?:(?:i|we)\s+(?:passed\s+(?:my|the)\s+(?:exam|test|interview)|(?:feel|am)\s+(?:really\s+)?(?:happy|great|excited)(?:\s+today)?|got\s+accepted)|i(?:'m| am)\s+doing\s+(?:really\s+)?(?:great|good|well|fine)(?:\s+today)?|i\s+feel\s+(?:really\s+)?good(?:\s+today)?)\b/i.test(text)) {
    return "That's good news! Thanks for sharing it. What part of today are you most pleased about?";
  }
  return null;
}

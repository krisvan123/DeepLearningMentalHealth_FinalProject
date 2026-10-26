# MindCare — Demo Video Plan (target 4:20, maximum 4:59)

**Status: storyboard and spoken script only.** Real screen capture,
real narration and an MP4/YouTube link are still needed.

## Timeline and speaking notes

### 0:00–0:25 — Title and problem (25 seconds)
Screen: title slide "MindCare — Eight-Class Mental Health Text Classification using Bi-LSTM".

Narration (Indonesian):
"Halo, kami dari kelompok [nama kelompok]. MindCare adalah prototipe
Final Project Deep Learning untuk mengklasifikasikan teks menggunakan
Bidirectional LSTM. Tujuannya mempelajari penerapan deep learning pada
kategori teks yang berkaitan dengan kesejahteraan emosional."

### 0:25–0:55 — Data and preprocessing (30 seconds)
Screen: /research, show the dataset section and model design.

"Kode training kami mengolah sumber teks untuk delapan kategori.
Sumber dan izin penggunaan dataset asli harus diverifikasi dan akan
dicantumkan pada laporan. Tokenisasi dan padding digunakan untuk
menyiapkan input model."

### 0:55–1:35 — Architecture and verified results (40 seconds)
Screen: /research, show architecture and historical values.

"Arsitektur yang digunakan adalah Embedding, Bidirectional LSTM,
Dropout, Dense dan Softmax. Metadata model sebelumnya mencatat
8.000 sampel, training accuracy 77,31%, dan validation accuracy
74,50%. Angka ini hasil validasi model lama, bukan akurasi diagnosis."

### 1:35–2:35 — Real model inference (60 seconds)
Screen: /analysis. Enter an innocuous test sentence, show eight numeric
scores and latency. Change the input to a generic everyday sentence.

"Pada Model Analysis, teks langsung diproses Bi-LSTM di browser
menggunakan TensorFlow.js. Dapat dilihat kategori prediksi dan distribusi
skornya, tanpa template chat yang menggantikan hasil model."

### 2:35–3:25 — Contextual chat + UX (50 seconds)
Screen: /, two normal conversations; show typing indicator and input composer.

"Fitur chat terpisah menggunakan pengenalan maksud percakapan dan
respons panduan berbasis aturan. Ini membantu percakapan menjadi
lebih sesuai konteks. Namun respons tersebut bukan AI generatif
dan bukan hasil diagnosis klinis."

### 3:25–4:00 — Evaluation and limitations (35 seconds)
Screen: /research. Show missing-evidence warning.

"Kami juga menyiapkan pengujian regresi untuk konteks percakapan dan
script eksperimen pembanding LSTM versus Bi-LSTM. Hasil eksperimen
tambahan tidak boleh dianggap tersedia sebelum dataset yang sah
diterima dan eksperimen dijalankan. Keterbatasan terutama pada
dataset, generalisasi bahasa Indonesia dan evaluasi per kelas."

### 4:00–4:20 — Conclusion (20 seconds)
Screen: repo + app link.

"Kesimpulannya, MindCare mengintegrasikan model Bi-LSTM, web
interaktif dan pengujian. Pengembangan berikutnya difokuskan
pada evaluasi yang lebih representatif. Terima kasih."

## Recording checklist

- Capture from actual deployed website; do not substitute a mockup.
- Check that /analysis always runs the neural model.
- Use benign invented example text, not real personal disclosures.
- Keep browser clean, zoom about 100%, readable screen capture.
- Confirm /research numbers match committed historical metadata.
- Speak clearly and edit to **less than 5 minutes**.
- Record actual demo, not a generated screenshot that pretends to be live.
- Export MP4 / provide unlisted YouTube link after team review.

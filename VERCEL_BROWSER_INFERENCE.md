# MindCare without LocalTunnel (Vercel)

The public Next.js chat now executes the **original converted Keras Bi-LSTM** in
the visitor's browser with TensorFlow.js. The model files are static files in
`frontend/public/mindcare-model/`. The local FastAPI backend remains useful
for testing, but is **not used by the public chat**.

## After pushing to main

1. Check Vercel is deploying the repo's `main` branch and the `frontend`
   directory is set as the project root.
2. Remove the previous `MODEL_API_URL` and `NEXT_PUBLIC_API_URL`
   environment variables that pointed to LocalTunnel; no public backend URL is
   required.
3. Redeploy to ensure the new JavaScript bundle and converted model assets
   are uploaded together.
4. Open the public website. Its model indicator becomes *Ready* only once the
   browser has fetched and loaded the model weights.
5. The JSON endpoint `/api/health` intentionally reports
   `status: "browser_inference"` and `model_ready: null`. It cannot measure
   whether a particular visitor's browser loaded the model.
6. The old `/api/chat` endpoint returns HTTP 410. Use the chat UI instead.

## How the export works

A GitHub Action runs `scripts/export_browser_model.py` to convert
`models/model_final.h5` into `model.json` and shard files, and serializes the
trained `models/tokenizer.pickle` into safe JSON. It also exports controlled
response templates. The action checks the **actual model** with the JavaScript
TensorFlow.js runtime before committing the browser assets.

No placeholder or newly initialized model is substituted. The original model
has **not been retrained**, and its documented validation accuracy remains
74.5%. Running the model in a browser does not make its predictions clinical
assessments or improve accuracy. All classification output remains an
experimental category estimate.

## Availability and privacy

The website requires Vercel/CDN availability, compatible browser capabilities,
and an initial model download. It does not require the developer's laptop,
tunnels, or a constantly running Python backend. The first visit can take
longer because the browser downloads approximately 4 MB of weights plus
JavaScript. Browser-side inference sends message contents to neither the old
backend nor a new third-party inference service.

No web app can guarantee 100% uptime or successful execution on every device.
Monitor model loading errors and test on desktops and mobile browsers.

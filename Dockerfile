FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt ./
RUN pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu && pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY config/ ./config/
COPY model/ ./model/
COPY models/transformer/ ./models/transformer/
COPY preprocessing/ ./preprocessing/
COPY respon/ ./respon/
COPY response/ ./response/
COPY utils/ ./utils/
ENV PORT=7860
EXPOSE 7860
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "7860"]

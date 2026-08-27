FROM python:3.11-slim
WORKDIR /app
COPY py_server.py ./
COPY public ./public
COPY uploads ./uploads
RUN mkdir -p uploads
# no pip deps — stdlib only
EXPOSE 3000
ENV PORT=3000
CMD ["python", "py_server.py"]

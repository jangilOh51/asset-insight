#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== 1. Docker DB 시작 ==="
docker compose -f "$ROOT/docker-compose.yml" up -d
echo "DB 준비 대기 중..."
until docker exec asset_insight_postgres pg_isready -U postgres -d asset_insight &>/dev/null; do
  sleep 2
done
echo "DB 준비 완료"

echo ""
echo "=== 2. .env 파일 확인 ==="
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo ".env 파일 생성됨 → KIS API 키를 입력하세요: $ROOT/.env"
else
  echo ".env 파일 존재"
fi

echo ""
echo "=== 3. Python 패키지 설치 ==="
cd "$ROOT/backend"
uv sync

echo ""
echo "=== 4. DB 마이그레이션 ==="
uv run alembic upgrade head

echo ""
echo "=== 완료 ==="
echo "백엔드 실행: cd backend && uv run uvicorn app.main:app --reload --port 8000"
echo "API 문서:   http://localhost:8000/docs"

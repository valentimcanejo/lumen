# LUMEN — Data Model (Firestore)

## Coleções públicas (read-only)

- tracks/{trackId}
- lessons/{lessonId}
- daily_sessions/{YYYY-MM-DD}
- (opcional no MVP) cards/{cardId}, quizzes/{quizId}

> Recomendação de custo: conteúdo grande em "packs" JSON fora do Firestore.

## Coleções privadas (por usuário)

- users/{uid}
- users/{uid}/daily_sessions/{YYYY-MM-DD}
- users/{uid}/progress_lessons/{lessonId}
- users/{uid}/progress_cards/{cardId}

## users/{uid}

- lang: pt|en|es
- dailyGoalMin: 5|10|15
- selectedTrackIds: string[]
- premium: { isActive, until? }
- streak: { current, best, lastStudyDate, shields }

## tracks

- title/description: {pt,en,es}
- tags, difficulty, order

## lessons (índice leve)

- title/summary: {pt,en,es}
- estimatedMinutes, tags, difficulty
- packRef (ex: packs/2026-01-22/en.json ou packs/lesson_x/en.json)
- status, publishedAt

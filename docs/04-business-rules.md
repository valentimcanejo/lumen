# LUMEN — Business Rules

## Streak

- Atualiza ao concluir SummaryScreen.
- Se today == lastStudyDate: mantém
- Se today == lastStudyDate + 1: current++
- Se gap > 1:
  - se shields > 0: shields-- e mantém current
  - senão: current = 1
- best = max(best, current)

## Sessão diária

- “Dose do Dia” é limitada; nada de feed infinito.
- Extra +3 min é opcional após concluir a dose.

## Progresso

- Lesson: completedAt, score, timeSpent
- Cards: lastSeen, nextReview, ease/interval (spaced repetition)

## Premium

- IA e recursos avançados apenas com premium ativo.
- Conteúdo curado permanece igual para free/premium.

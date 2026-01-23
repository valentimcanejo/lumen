# LUMEN — Content Packs

## Objetivo

Reduzir custo no Firestore e melhorar performance:

- 1 read para pegar a referência do pack
- 1 download do pack (cacheável)

## Modelos

### Modelo A (Dose do Dia)

packs/YYYY-MM-DD/{lang}.json
Ex:

- packs/2026-01-22/en.json
- packs/2026-01-22/pt.json
- packs/2026-01-22/es.json

### Modelo B (Por lição)

packs/lessons/{lessonId}/{lang}.json

## Estrutura sugerida do pack (exemplo)

{
"date": "2026-01-22",
"lesson": {...},
"cards": [...],
"quiz": {...},
"estimatedMinutes": 8,
"version": 3
}

## Cache

- Salvar pack em disco (expo-file-system)
- Guardar versão em users/{uid} ou local storage
- Rebaixar apenas se versão mudou

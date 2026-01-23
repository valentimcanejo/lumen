# LUMEN — Tech Architecture

## Stack

- React Native + Expo
- React Navigation
- Firebase Auth
- Firestore (progresso + índices)
- Firebase Hosting/Storage (packs JSON + áudio)
- i18n: i18next
- Cache local: expo-file-system + (opcional) expo-sqlite

## Estratégia de custo/performance

- Firestore: leituras mínimas (daily_sessions + índices)
- Packs JSON: baixados via CDN + cache local
- Atualiza packs por versão (packVersion)

## Módulos principais

- /src/services (firestore, auth, packs)
- /src/features (session, tracks, library, profile, premium)
- /src/i18n

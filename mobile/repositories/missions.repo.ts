import { getDocData, updateDocData } from "../services/firestore.service";
import type {
  UserProfile,
  MissionId,
  DailyMission,
} from "../models/user";
import { xpToLevel } from "../models/user";

// ---------------------------------------------------------------------------
// Mission pool — 4 missions, 3 selected per day deterministically
// ---------------------------------------------------------------------------

type MissionTemplate = { id: MissionId; xpReward: number };

const MISSION_POOL: MissionTemplate[] = [
  { id: "complete_session", xpReward: 5 },
  { id: "quiz_score_80",    xpReward: 10 },
  { id: "quiz_score_100",   xpReward: 15 },
  { id: "review_cards",     xpReward: 8 },
];

/** Deterministic selection of 3 missions from pool, seeded by date string. */
function getMissionsForDate(date: string): DailyMission[] {
  let seed = 0;
  for (const c of date) seed = ((seed * 31 + c.charCodeAt(0)) >>> 0);

  const pool = [...MISSION_POOL];
  const selected: DailyMission[] = [];
  while (selected.length < 3 && pool.length > 0) {
    const idx = seed % pool.length;
    selected.push({ ...pool[idx], completed: false });
    pool.splice(idx, 1);
    seed = ((seed * 1664525 + 1013904223) >>> 0);
  }
  return selected;
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Loads (or initializes) today's missions for the user. */
export async function getTodayMissions(uid: string): Promise<DailyMission[]> {
  const today = todayYmd();
  const user = await getDocData<UserProfile>(`users/${uid}`);
  const cm = user?.currentMissions;

  if (cm?.date === today) return cm.list;

  const list = getMissionsForDate(today);
  await updateDocData<UserProfile>(`users/${uid}`, {
    currentMissions: { date: today, list },
  });
  return list;
}

/**
 * Marks missions as completed based on session/review context.
 * Grants XP for newly completed missions.
 * Returns the XP granted and the IDs of newly completed missions.
 */
export async function checkAndCompleteDailyMissions(
  uid: string,
  context: {
    sessionCompleted?: boolean;
    quizScore?: number;
    quizDone?: boolean;
    cardsReviewed?: number;
  },
): Promise<{ xpGranted: number; completedMissionIds: MissionId[] }> {
  const today = todayYmd();
  const user = await getDocData<UserProfile>(`users/${uid}`);
  if (!user) return { xpGranted: 0, completedMissionIds: [] };

  const cm = user.currentMissions;
  const list: DailyMission[] =
    cm?.date === today ? cm.list.map((m) => ({ ...m })) : getMissionsForDate(today);

  const {
    sessionCompleted = false,
    quizScore = 0,
    quizDone = false,
    cardsReviewed = 0,
  } = context;

  const newlyCompleted: MissionId[] = [];
  let xpGranted = 0;

  for (const mission of list) {
    if (mission.completed) continue;

    let shouldComplete = false;
    switch (mission.id) {
      case "complete_session": shouldComplete = sessionCompleted; break;
      case "quiz_score_80":    shouldComplete = quizDone && quizScore >= 0.8; break;
      case "quiz_score_100":   shouldComplete = quizDone && quizScore >= 1.0; break;
      case "review_cards":     shouldComplete = cardsReviewed >= 3; break;
    }

    if (shouldComplete) {
      mission.completed = true;
      newlyCompleted.push(mission.id);
      xpGranted += mission.xpReward;
    }
  }

  if (newlyCompleted.length > 0 || cm?.date !== today) {
    if (xpGranted > 0) {
      const currentXp = user.xp ?? 0;
      const newXp = currentXp + xpGranted;
      const newLevel = xpToLevel(newXp);
      await updateDocData<UserProfile>(`users/${uid}`, {
        currentMissions: { date: today, list },
        xp: newXp,
        level: newLevel,
        updatedAt: Date.now(),
      });
    } else {
      await updateDocData<UserProfile>(`users/${uid}`, {
        currentMissions: { date: today, list },
      });
    }
  }

  return { xpGranted, completedMissionIds: newlyCompleted };
}

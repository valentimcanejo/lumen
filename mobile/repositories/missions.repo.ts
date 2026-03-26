import { getDocData, updateDocData } from "../services/firestore.service";
import type {
  UserProfile,
  MissionId,
  DailyMission,
  WeeklyMissionId,
  WeeklyMission,
} from "../models/user";
import { xpToLevel } from "../models/user";
import { getCurrentWeekId } from "./leaderboard.repo";

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
export function getMissionsForDate(date: string): DailyMission[] {
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

// ---------------------------------------------------------------------------
// Weekly missions — reset every Monday, progress tracked cumulatively
// ---------------------------------------------------------------------------

export const WEEKLY_MISSIONS_DEFAULT: WeeklyMission[] = [
  { id: "complete_5_sessions", progress: 0, target: 5,   xpReward: 30, completed: false },
  { id: "earn_300_xp",         progress: 0, target: 300, xpReward: 40, completed: false },
  { id: "perfect_quiz",        progress: 0, target: 1,   xpReward: 25, completed: false },
  { id: "study_3_days",        progress: 0, target: 3,   xpReward: 20, completed: false },
];

/**
 * Returns the current week's missions for a user (initializes if new week).
 * Used by the home screen to display mission state.
 */
export async function getWeeklyMissions(uid: string): Promise<WeeklyMission[]> {
  const weekId = getCurrentWeekId();
  const user = await getDocData<UserProfile>(`users/${uid}`);
  const cwm = user?.currentWeeklyMissions;
  if (cwm?.weekId === weekId) return cwm.list;

  const list = WEEKLY_MISSIONS_DEFAULT.map((m) => ({ ...m }));
  await updateDocData<UserProfile>(`users/${uid}`, {
    currentWeeklyMissions: { weekId, list, studyDates: [] },
  });
  return list;
}

export type { WeeklyMissionId, WeeklyMission };

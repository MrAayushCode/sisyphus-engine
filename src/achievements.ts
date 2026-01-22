import { Achievement } from './types';

export const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, "unlocked" | "unlockedAt">[] = [
    // --- EARLY GAME ---
    { id: "first_blood", name: "First Blood", description: "Complete your first quest.", rarity: "common" },
    { id: "week_warrior", name: "Week Warrior", description: "Maintain a 7-day streak.", rarity: "common" },
    { id: "warm_up", name: "Warm Up", description: "Complete 10 total quests.", rarity: "common" },

    // --- MID GAME ---
    { id: "skill_adept", name: "Apprentice", description: "Reach Level 5 in any skill.", rarity: "rare" },
    { id: "chain_gang", name: "Chain Gang", description: "Complete a Quest Chain.", rarity: "rare" },
    { id: "researcher", name: "Scholar", description: "Complete 5 Research Quests.", rarity: "rare" },
    { id: "rich", name: "Capitalist", description: "Hold 500 gold at once.", rarity: "rare" },

    // --- END GAME ---
    { id: "boss_slayer", name: "Giant Slayer", description: "Defeat your first Boss.", rarity: "epic" },
    { id: "ascended", name: "Sisyphus Happy", description: "Reach Level 50.", rarity: "legendary" },
    { id: "immortal", name: "Immortal", description: "Reach Level 20 with 0 Deaths.", rarity: "legendary" }
];

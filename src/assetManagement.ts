import type { AiAssetHistoryItem, CompanionMotion, GameState, ThemeId } from "./gameEngine";

function withoutKey<T>(record: Partial<Record<string, T>>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

export function removeAnimationAssetState(state: GameState, theme: ThemeId, motion: CompanionMotion): GameState {
  const themeSlots = withoutKey(state.sceneAnimationSlots[theme] ?? {}, motion);
  const themeAssets = withoutKey(state.animationAssets[theme] ?? {}, motion);
  return {
    ...state,
    sceneAnimationSlots: { ...state.sceneAnimationSlots, [theme]: themeSlots },
    animationAssets: { ...state.animationAssets, [theme]: themeAssets },
    animationSample: state.animationSample?.theme === theme && state.animationSample.motion === motion ? undefined : state.animationSample,
  };
}

export function removeSceneAssetState(state: GameState, theme: ThemeId): GameState {
  return {
    ...state,
    aiScenes: withoutKey(state.aiScenes, theme),
    aiSceneApprovals: withoutKey(state.aiSceneApprovals, theme),
    aiStateScenes: withoutKey(state.aiStateScenes, theme),
    sceneAnimationSlots: withoutKey(state.sceneAnimationSlots, theme),
    animationAssets: withoutKey(state.animationAssets, theme),
    animationSample: state.animationSample?.theme === theme ? undefined : state.animationSample,
  };
}

export function clearAiAssetState(state: GameState): GameState {
  return {
    ...state,
    aiCharacter: false,
    characterVariants: {},
    aiRooms: {},
    aiScenes: {},
    aiSceneApprovals: {},
    aiStateScenes: {},
    animationSlots: {},
    sceneAnimationSlots: {},
    animationAssets: {},
    animationSample: undefined,
    aiAssetHistory: [],
  };
}

export function addAiAssetHistoryItem(state: GameState, item: AiAssetHistoryItem): GameState {
  return { ...state, aiAssetHistory: [item, ...(state.aiAssetHistory ?? []).filter((entry) => entry.id !== item.id)] };
}

export function removeAiAssetHistoryItem(state: GameState, id: string): GameState {
  return { ...state, aiAssetHistory: (state.aiAssetHistory ?? []).filter((item) => item.id !== id) };
}

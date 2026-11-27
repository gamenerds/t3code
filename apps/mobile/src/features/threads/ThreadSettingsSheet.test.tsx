import { describe, expect, it } from "@effect/vitest";
import { RegistryContext } from "@effect/atom-react";
import {
  DEFAULT_SERVER_SETTINGS,
  EnvironmentId,
  ProviderInstanceId,
  type ServerConfig,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { Atom, AtomRegistry } from "effect/reactivity";
import { act, type ComponentType, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, vi } from "vite-plus/test";

import type { AppBarMenu, AppBarProps } from "../../components/ui/AppBar.types";
import type { ModelOption, ProviderGroup } from "../../lib/modelOptions";
import * as MobileDatabase from "../../persistence/mobile-database";
import * as MobilePreferences from "../../persistence/mobile-preferences";
import * as MobileSecureStorage from "../../persistence/mobile-secure-storage";

const harness = vi.hoisted(() => ({
  latestAppBarProps: null as AppBarProps | null,
  storage: {
    preferencesJson: null as { payload: string; updatedAt: number } | null,
    secure: new Map<string, string>(),
  },
  preferencesAtom: null as unknown,
  saveMobilePreferences: null as unknown,
  serverConfigsAtom: null as unknown,
}));

vi.mock("expo-haptics", () => ({
  selectionAsync: vi.fn(async () => {}),
}));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
}));

vi.mock("../../lib/runtime", async () => {
  const EffectLayer = await import("effect/Layer");
  return {
    runtime: { runPromise: vi.fn() },
    layer: EffectLayer.empty,
  };
});

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Pressable: ({ children, onPress }: { children?: ReactNode; onPress?: () => void }) => (
    <button onClick={onPress}>{children}</button>
  ),
  ScrollView: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-native-reanimated", () => ({
  default: {
    View: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  },
  FadeIn: { duration: () => undefined },
  FadeOut: { duration: () => undefined },
  LinearTransition: { duration: () => undefined },
  useReducedMotion: () => false,
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: vi.fn(), goBack: vi.fn() }),
  useRoute: () => ({ params: {} }),
}));

vi.mock("@legendapp/list/reanimated", () => ({
  AnimatedLegendList: <T,>(props: {
    data: ReadonlyArray<T>;
    keyExtractor: (item: T) => string;
    renderItem: (info: { item: T; index: number }) => ReactNode;
  }) => (
    <div>
      {props.data.map((item, index) => (
        <div key={props.keyExtractor(item)}>{props.renderItem({ item, index })}</div>
      ))}
    </div>
  ),
}));

vi.mock("../../native/createV5StackNavigator", () => ({
  createV5StackNavigator: () => ({
    Navigator: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Screen: ({ name, component: Component }: { name: string; component: ComponentType }) =>
      name === "ThreadSettingsModels" ? <Component /> : null,
  }),
}));

vi.mock("../layout/nested-stacks", () => ({
  useSheetStackOptions: () => ({}),
}));

vi.mock("../../components/ui/Dialog", () => ({
  alert: vi.fn(),
}));

vi.mock("../../components/ui/AppBar", () => ({
  AppBar: (props: AppBarProps) => {
    harness.latestAppBarProps = props;
    return null;
  },
}));

vi.mock("../../components/ui/AppSymbol", () => ({ SymbolView: () => null }));
vi.mock("../../components/ui/AppText", () => ({
  AppText: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));
vi.mock("../../components/ProviderIcon", () => ({ ProviderIcon: () => null }));
vi.mock("../../components/ui/ThemedSwitch", () => ({ ThemedSwitch: () => null }));
vi.mock("../../components/ui/RefreshControl", () => ({ RefreshControl: () => null }));
vi.mock("../../components/ui/ScreenContent", () => ({
  ScreenContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock("../../components/ui/useBarInset", () => ({ useSearchToolbarInset: () => 0 }));
vi.mock("../../components/ui/listMetrics", () => ({
  READABLE_WIDTH_STYLE: {},
  ROW_MIN_HEIGHT: { item: 44, control: 44 },
}));
vi.mock("../../lib/appState", () => ({ useReduceMotionEnabled: () => false }));
vi.mock("./ChatGptSharingStatus", () => ({ ChatGptSharingStatus: () => null }));
vi.mock("./ThreadSettingsRows", () => ({
  ModelRow: ({ option }: { option: ModelOption }) => <div data-model={option.key} />,
  ChoiceRow: () => null,
}));
vi.mock("./provider-catalog-refresh", () => ({
  createProviderCatalogRefreshRunner: () => vi.fn(async () => ({ _tag: "Success", value: null })),
  providerCatalogRefreshError: () => null,
}));
vi.mock("./new-task-flow-provider", () => ({ useNewTaskFlow: () => null }));
vi.mock("../../connection/catalog", () => ({
  environmentCatalog: { stateAtom: () => null },
}));
vi.mock("../../state/query", () => ({
  useEnvironmentQuery: () => ({ data: undefined }),
}));
vi.mock("../../state/entities", () => ({
  useThreadReportedModelSelection: () => null,
}));
vi.mock("../../state/use-composer-drafts", () => ({
  setComposerDraftText: vi.fn(),
  updateComposerDraftSettings: vi.fn(),
  useComposerDraft: () => ({ text: "" }),
  useComposerDraftSettings: () => ({}),
}));
vi.mock("../../state/use-thread-detail", () => ({ useQuietThreadStructure: () => null }));
vi.mock("../../state/queued-run-edit", () => ({
  activeComposerDraftKey: (threadKey: string) => threadKey,
  useQueuedRunEdit: () => null,
}));
vi.mock("../../state/thread-model-selection", () => ({ selectThreadModel: vi.fn() }));
vi.mock("../../state/use-thread-selection", () => ({ useThreadSelection: () => ({}) }));
vi.mock("../../state/use-selected-thread-worktree", () => ({
  useSelectedThreadWorktree: () => ({ selectedThreadCwd: null }),
}));
vi.mock("../../state/provider-workspace-snapshot-refresh", () => ({
  providerWorkspaceSnapshotRefresh: () => Atom.make(null),
}));
vi.mock("../../state/thread-provider-switching", () => ({
  threadAllowsProviderSwitch: () => true,
}));
vi.mock("../../state/use-model-option-memory", () => ({
  rememberModelOptions: vi.fn(),
  withRememberedModelOptions: <T,>(selection: T) => selection,
}));

vi.mock("../../state/server", () => ({
  get environmentServerConfigsAtom() {
    return harness.serverConfigsAtom;
  },
  serverEnvironment: {
    updateSettings: { label: "updateSettings" },
    refreshProviders: { label: "refreshProviders" },
    providerRuntimeModeLimits: () => null,
  },
}));

vi.mock("../../state/preferences", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../state/preferences")>();
  return {
    ...actual,
    get mobilePreferencesAtom() {
      return harness.preferencesAtom;
    },
    get saveMobilePreferences() {
      return harness.saveMobilePreferences;
    },
  };
});

import { createMobilePreferencesState } from "../../state/preferences";
import { ThreadSettingsPickerScreen } from "./ThreadSettingsSheet";

const ENVIRONMENT_ID = EnvironmentId.make("env-1");
const CODEX_ID = ProviderInstanceId.make("codex");

function makeModel(model: string): ModelOption {
  return {
    key: `${CODEX_ID}:${model}`,
    label: model,
    subtitle: "",
    providerKey: CODEX_ID,
    providerLabel: "Codex",
    providerDriver: "codex",
    isDefault: false,
    isLegacy: false,
    capabilities: null,
    selection: {
      instanceId: CODEX_ID,
      model,
      options: [],
    },
  };
}

function makePreferencesRuntime() {
  const databaseLayer = Layer.succeed(
    MobileDatabase.MobileDatabase,
    MobileDatabase.MobileDatabase.of({
      loadPreferencesJson: Effect.sync(() => Option.fromNullishOr(harness.storage.preferencesJson)),
      savePreferencesJson: (payload: string, updatedAt: number) =>
        Effect.sync(() => {
          harness.storage.preferencesJson = { payload, updatedAt };
        }),
      loadCache: () => Effect.succeedNone,
      saveCache: () => Effect.void,
      clearEnvironmentCache: () => Effect.void,
      clearAllCaches: () => Effect.void,
    } as unknown as MobileDatabase.MobileDatabase["Service"]),
  );
  const secureStorageLayer = Layer.succeed(
    MobileSecureStorage.MobileSecureStorage,
    MobileSecureStorage.MobileSecureStorage.of({
      getItem: (key) => Effect.sync(() => harness.storage.secure.get(key) ?? null),
      setItem: (key, value) =>
        Effect.sync(() => {
          harness.storage.secure.set(key, value);
        }),
      removeItem: (key) =>
        Effect.sync(() => {
          harness.storage.secure.delete(key);
        }),
    }),
  );
  return Atom.runtime(
    MobilePreferences.layer.pipe(Layer.provide(Layer.merge(databaseLayer, secureStorageLayer))),
  );
}

function findFavoritesOnlyMenuItem(menus: ReadonlyArray<AppBarMenu> | undefined) {
  const item = menus?.flatMap((menu) => menu.items).find((entry) => entry.id === "favorites-only");
  if (!item || "items" in item) {
    throw new Error("Expected favorites-only toggle item in AppBar menus");
  }
  return item;
}

describe("ThreadSettingsPickerScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    harness.latestAppBarProps = null;
    harness.storage.preferencesJson = null;
    harness.storage.secure.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect(
    "remembers Favorites only across same-session reopen, fresh reload, and rapid toggles",
    () =>
      Effect.gen(function* () {
        const favoriteModel = makeModel("gpt-6.2-sol");
        const otherModel = makeModel("gpt-6.1-terra");
        const providerGroups: ReadonlyArray<ProviderGroup> = [
          {
            providerKey: CODEX_ID,
            providerLabel: "Codex",
            models: [favoriteModel, otherModel],
          },
        ];
        harness.serverConfigsAtom = Atom.make(
          new Map<EnvironmentId, ServerConfig>([
            [
              ENVIRONMENT_ID,
              {
                environment: { capabilities: { modelCatalogRefresh: false } },
                providers: [],
                settings: {
                  ...DEFAULT_SERVER_SETTINGS,
                  favorites: [{ provider: CODEX_ID, model: "gpt-6.2-sol" }],
                },
              } as unknown as ServerConfig,
            ],
          ]),
        );

        const visibleModelKeys = (container: HTMLElement) =>
          Array.from(container.querySelectorAll("[data-model]")).map((el) =>
            el.getAttribute("data-model"),
          );

        const createSessionRegistry = () =>
          Effect.gen(function* () {
            const state = createMobilePreferencesState(makePreferencesRuntime());
            harness.preferencesAtom = state.preferencesAtom;
            harness.saveMobilePreferences = state.savePreferences;
            const registry = AtomRegistry.make();
            const unmountPrefs = registry.mount(state.preferencesAtom);
            yield* AtomRegistry.getResult(registry, state.preferencesAtom, {
              suspendOnWaiting: true,
            });
            return {
              registry,
              dispose: () => {
                unmountPrefs();
                registry.dispose();
              },
            };
          });

        const mountPicker = (registry: AtomRegistry.AtomRegistry) =>
          Effect.gen(function* () {
            const container = document.createElement("div");
            const root = createRoot(container);
            yield* Effect.promise(() =>
              act(async () => {
                root.render(
                  <RegistryContext.Provider value={registry}>
                    <ThreadSettingsPickerScreen
                      environmentId={ENVIRONMENT_ID}
                      projectId={null}
                      cwd={null}
                      providerInstanceId={CODEX_ID}
                      providerGroups={providerGroups}
                      selectedModel={otherModel.selection}
                      prompt=""
                      onPromptChange={() => {}}
                      onSelectModel={() => {}}
                      optionDescriptors={[]}
                      onUpdateOptionSelections={() => {}}
                      runtimeMode="full-access"
                      onUpdateRuntimeMode={() => {}}
                      onClose={() => {}}
                    />
                  </RegistryContext.Provider>,
                );
              }),
            );

            return {
              container,
              unmount: () =>
                Effect.promise(async () => {
                  await act(async () => {
                    root.unmount();
                  });
                }),
            };
          });

        // Same-session reopen keeps Favorites only on, and two rapid presses flip back off.
        const firstSession = yield* createSessionRegistry();
        const firstOpen = yield* mountPicker(firstSession.registry);
        expect(visibleModelKeys(firstOpen.container)).toEqual([favoriteModel.key, otherModel.key]);
        expect(findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).selected).toBe(false);

        yield* Effect.promise(() =>
          act(async () => {
            findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).onPress();
          }),
        );
        expect(findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).selected).toBe(true);
        expect(visibleModelKeys(firstOpen.container)).toEqual([favoriteModel.key]);
        yield* firstOpen.unmount();

        const sameSessionReopen = yield* mountPicker(firstSession.registry);
        expect(findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).selected).toBe(true);
        expect(visibleModelKeys(sameSessionReopen.container)).toEqual([favoriteModel.key]);
        yield* sameSessionReopen.unmount();
        firstSession.dispose();

        // Fresh runtime reload restores Favorites only from persisted storage.
        const reloadedSession = yield* createSessionRegistry();
        const reloadedOpen = yield* mountPicker(reloadedSession.registry);
        expect(findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).selected).toBe(true);
        expect(visibleModelKeys(reloadedOpen.container)).toEqual([favoriteModel.key]);

        // Two presses before a render invert twice (true -> false -> true).
        const toggleBeforeRender = findFavoritesOnlyMenuItem(
          harness.latestAppBarProps?.menus,
        ).onPress;
        yield* Effect.promise(() =>
          act(async () => {
            toggleBeforeRender();
            toggleBeforeRender();
          }),
        );
        expect(findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).selected).toBe(true);

        // Single press turns it back off and persists false across reload.
        yield* Effect.promise(() =>
          act(async () => {
            findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).onPress();
          }),
        );
        expect(findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).selected).toBe(false);
        expect(visibleModelKeys(reloadedOpen.container)).toEqual([
          favoriteModel.key,
          otherModel.key,
        ]);
        yield* reloadedOpen.unmount();
        reloadedSession.dispose();

        const finalSession = yield* createSessionRegistry();
        const finalOpen = yield* mountPicker(finalSession.registry);
        expect(findFavoritesOnlyMenuItem(harness.latestAppBarProps?.menus).selected).toBe(false);
        expect(visibleModelKeys(finalOpen.container)).toEqual([favoriteModel.key, otherModel.key]);
        yield* finalOpen.unmount();
        finalSession.dispose();
      }),
  );
});

import * as FS from "node:fs";
import * as Path from "node:path";

import type { ModelCapabilities, ServerProviderModel } from "@t3tools/contracts";
import { Duration, Effect, Equal, Layer, Stream } from "effect";

import { makeManagedServerProvider } from "../makeManagedServerProvider";
import { buildServerProvider, providerModelsFromSettings } from "../providerSnapshot";
import { PiProvider } from "../Services/PiProvider";
import { ServerSettingsService } from "../../serverSettings";
import {
  buildPiLauncherEnv,
  DEFAULT_PI_SCRIPT_PATH,
  probePiModels,
  probePiVersion,
  resolvePiLauncherPath,
  type PiRpcModel,
} from "../pi/PiRpc";

const PROVIDER = "pi" as const;
const DEFAULT_MODEL_SLUG = "default";
const DEFAULT_REASONING_CAPABILITIES: ModelCapabilities = {
  reasoningEffortLevels: [
    { value: "xhigh", label: "Extra High" },
    { value: "high", label: "High", isDefault: true },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ],
  supportsFastMode: false,
  supportsThinkingToggle: false,
  contextWindowOptions: [],
  promptInjectedEffortLevels: [],
};
const DEFAULT_NON_REASONING_CAPABILITIES: ModelCapabilities = {
  reasoningEffortLevels: [],
  supportsFastMode: false,
  supportsThinkingToggle: false,
  contextWindowOptions: [],
  promptInjectedEffortLevels: [],
};
const FALLBACK_MODELS: ReadonlyArray<ServerProviderModel> = [
  {
    slug: DEFAULT_MODEL_SLUG,
    name: "Default (pi)",
    isCustom: false,
    capabilities: DEFAULT_REASONING_CAPABILITIES,
  },
];

function normalizeBinaryPath(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return DEFAULT_PI_SCRIPT_PATH;
  }
  if (trimmed === "~") {
    return process.env.HOME ?? process.cwd();
  }
  if (trimmed.startsWith("~/") || trimmed.startsWith("~\\")) {
    return `${process.env.HOME ?? process.cwd()}/${trimmed.slice(2)}`;
  }
  return trimmed;
}

function isExplicitBinaryPath(value: string): boolean {
  return (
    Path.isAbsolute(value) ||
    value.startsWith(".") ||
    value.startsWith("~") ||
    value.includes("/") ||
    value.includes("\\")
  );
}

function isMissingLauncherError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("enoent") ||
    message.includes("not found") ||
    message.includes("command not found") ||
    message.includes("is not installed") ||
    message.includes("cannot find")
  );
}

function modelCapabilitiesFromPiModel(model: PiRpcModel): ModelCapabilities {
  return model.reasoning ? DEFAULT_REASONING_CAPABILITIES : DEFAULT_NON_REASONING_CAPABILITIES;
}

function toServerProviderModels(
  models: ReadonlyArray<PiRpcModel>,
): ReadonlyArray<ServerProviderModel> {
  const unique = new Map<string, ServerProviderModel>();
  unique.set(DEFAULT_MODEL_SLUG, FALLBACK_MODELS[0]!);
  for (const model of models) {
    const slug = `${model.provider}/${model.id}`;
    if (unique.has(slug)) {
      continue;
    }
    unique.set(slug, {
      slug,
      name: slug,
      isCustom: false,
      capabilities: modelCapabilitiesFromPiModel(model),
    });
  }
  return [...unique.values()];
}

async function resolvePiProbe(input: {
  readonly binaryPath: string;
  readonly cwd: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly enableAutoreason?: boolean;
  readonly inheritExtensions?: boolean;
}): Promise<{
  readonly version: string | null;
  readonly models: ReadonlyArray<ServerProviderModel>;
}> {
  const [version, models] = await Promise.all([
    probePiVersion({
      binaryPath: input.binaryPath,
      ...(input.env ? { env: input.env } : {}),
      ...(typeof input.enableAutoreason === "boolean"
        ? { enableAutoreason: input.enableAutoreason }
        : {}),
      ...(typeof input.inheritExtensions === "boolean"
        ? { inheritExtensions: input.inheritExtensions }
        : {}),
    }),
    probePiModels({
      binaryPath: input.binaryPath,
      cwd: input.cwd,
      ...(input.env ? { env: input.env } : {}),
      ...(typeof input.enableAutoreason === "boolean"
        ? { enableAutoreason: input.enableAutoreason }
        : {}),
      ...(typeof input.inheritExtensions === "boolean"
        ? { inheritExtensions: input.inheritExtensions }
        : {}),
    }),
  ]);
  return {
    version,
    models: toServerProviderModels(models),
  };
}

function makePendingPiProvider(settings: {
  readonly enabled: boolean;
  readonly binaryPath: string;
  readonly homePath: string;
  readonly enableAutoreason: boolean;
  readonly fullAutonomy: boolean;
  readonly inheritExtensions: boolean;
  readonly customModels: ReadonlyArray<string>;
}) {
  const checkedAt = new Date().toISOString();
  const models = providerModelsFromSettings(
    FALLBACK_MODELS,
    PROVIDER,
    settings.customModels,
    DEFAULT_REASONING_CAPABILITIES,
  );

  if (!settings.enabled) {
    return buildServerProvider({
      provider: PROVIDER,
      enabled: false,
      checkedAt,
      models,
      probe: {
        installed: false,
        version: null,
        status: "warning",
        auth: { status: "unknown", label: "Managed by pi" },
        message: "Pi is disabled in MyCode settings.",
      },
    });
  }

  return buildServerProvider({
    provider: PROVIDER,
    enabled: true,
    checkedAt,
    models,
    probe: {
      installed: false,
      version: null,
      status: "warning",
      auth: { status: "unknown", label: "Managed by pi" },
      message: "Pi provider status has not been checked in this session yet.",
    },
  });
}

export const PiProviderLive = Layer.effect(
  PiProvider,
  Effect.gen(function* () {
    const serverSettings = yield* ServerSettingsService;

    const checkProvider = serverSettings.getSettings.pipe(
      Effect.flatMap((settings) => {
        const piSettings = settings.providers.pi;
        const configuredBinaryPath = normalizeBinaryPath(piSettings.binaryPath);
        const binaryPath = resolvePiLauncherPath(piSettings.binaryPath);
        const checkedAt = new Date().toISOString();
        const fallbackModels = providerModelsFromSettings(
          FALLBACK_MODELS,
          PROVIDER,
          piSettings.customModels,
          DEFAULT_REASONING_CAPABILITIES,
        );

        if (!piSettings.enabled) {
          return Effect.succeed(
            buildServerProvider({
              provider: PROVIDER,
              enabled: false,
              checkedAt,
              models: fallbackModels,
              probe: {
                installed: false,
                version: null,
                status: "warning",
                auth: { status: "unknown", label: "Managed by pi" },
                message: "Pi is disabled in MyCode settings.",
              },
            }),
          );
        }

        if (isExplicitBinaryPath(configuredBinaryPath) && !FS.existsSync(binaryPath)) {
          return Effect.succeed(
            buildServerProvider({
              provider: PROVIDER,
              enabled: true,
              checkedAt,
              models: fallbackModels,
              probe: {
                installed: false,
                version: null,
                status: "error",
                auth: { status: "unknown", label: "Managed by pi" },
                message: `Pi launcher not found at ${configuredBinaryPath}.`,
              },
            }),
          );
        }

        const launcherEnv = buildPiLauncherEnv({
          homePath: piSettings.homePath,
          disableTelemetry: true,
        });

        return Effect.promise(async () => {
          try {
            const probe = await resolvePiProbe({
              binaryPath,
              cwd: process.cwd(),
              ...(Object.keys(launcherEnv).length > 0 ? { env: launcherEnv } : {}),
              enableAutoreason: piSettings.enableAutoreason,
              inheritExtensions: piSettings.inheritExtensions,
            });
            return buildServerProvider({
              provider: PROVIDER,
              enabled: true,
              checkedAt,
              models: probe.models.length > 0 ? probe.models : fallbackModels,
              probe: {
                installed: true,
                version: probe.version,
                status: "ready",
                auth: { status: "unknown", label: "Managed by pi" },
                message: `Using ${binaryPath} as the pi RPC launcher.`,
              },
            });
          } catch (error) {
            let version: string | null = null;
            try {
              version = await probePiVersion({
                binaryPath,
                env: launcherEnv,
                enableAutoreason: piSettings.enableAutoreason,
                inheritExtensions: piSettings.inheritExtensions,
              });
            } catch {
              version = null;
            }
            return buildServerProvider({
              provider: PROVIDER,
              enabled: true,
              checkedAt,
              models: fallbackModels,
              probe: {
                installed: !isMissingLauncherError(error),
                version,
                status: isMissingLauncherError(error) ? "error" : "warning",
                auth: { status: "unknown", label: "Managed by pi" },
                message: isMissingLauncherError(error)
                  ? `Pi launcher not found: ${binaryPath}. Set a full path in Settings -> Providers if needed.`
                  : error instanceof Error
                    ? error.message
                    : "Could not probe pi models.",
              },
            });
          }
        });
      }),
    );

    return yield* makeManagedServerProvider({
      getSettings: serverSettings.getSettings.pipe(
        Effect.map((settings) => settings.providers.pi),
        Effect.orDie,
      ),
      streamSettings: serverSettings.streamChanges.pipe(
        Stream.map((settings) => settings.providers.pi),
      ),
      haveSettingsChanged: (previous, next) => !Equal.equals(previous, next),
      initialSnapshot: makePendingPiProvider,
      checkProvider,
      refreshInterval: Duration.minutes(5),
    });
  }),
);

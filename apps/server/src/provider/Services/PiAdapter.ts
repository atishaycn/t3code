/**
 * PiAdapter - Pi implementation of the generic provider adapter contract.
 *
 * This service owns Pi RPC process semantics and emits canonical provider
 * runtime events. It does not perform cross-provider routing or shared
 * orchestration concerns.
 *
 * @module PiAdapter
 */
import { Context } from "effect";

import type { ProviderAdapterError } from "../Errors.ts";
import type { ProviderAdapterShape } from "./ProviderAdapter.ts";

export interface PiAdapterShape extends ProviderAdapterShape<ProviderAdapterError> {
  readonly provider: "pi";
}

export class PiAdapter extends Context.Service<PiAdapter, PiAdapterShape>()(
  "t3/provider/Services/PiAdapter",
) {}

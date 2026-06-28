/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as fighters from "../fighters.js";
import type * as lib_country from "../lib/country.js";
import type * as lib_eventParse from "../lib/eventParse.js";
import type * as lib_fighterDiff from "../lib/fighterDiff.js";
import type * as lib_fighterHydrate from "../lib/fighterHydrate.js";
import type * as lib_fighterPrune from "../lib/fighterPrune.js";
import type * as lib_htmlParse from "../lib/htmlParse.js";
import type * as lib_postEventSync from "../lib/postEventSync.js";
import type * as scrape from "../scrape.js";
import type * as videoGenerate from "../videoGenerate.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  events: typeof events;
  fighters: typeof fighters;
  "lib/country": typeof lib_country;
  "lib/eventParse": typeof lib_eventParse;
  "lib/fighterDiff": typeof lib_fighterDiff;
  "lib/fighterHydrate": typeof lib_fighterHydrate;
  "lib/fighterPrune": typeof lib_fighterPrune;
  "lib/htmlParse": typeof lib_htmlParse;
  "lib/postEventSync": typeof lib_postEventSync;
  scrape: typeof scrape;
  videoGenerate: typeof videoGenerate;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

import { redirect } from "next/navigation";

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

/**
 * Groups an array of objects by a specified key.
 * @param {T[]} array - The array to group.
 * @param {(item: T) => string} key - The key function to determine the group for each item.
 * @returns {Record<string, T[]>} - An object where each key is a group and the value is an array of items in that group.
 */
export function groupBy<T>(
  array: T[],
  key: (item: T) => string
): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = key(item);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

/**
 * Parses search parameters from a URL into a structured object along with
 * their default values.
 * @param {Record<string, string>} params - The search parameters to parse.
 * @returns {Object} - An object containing parsed parameters.
 */
export function parseDealSearchParams(params: { [key: string]: string }): {
  tier?: number;
  minProfit: number;
  minPercentualProfit: number;
  profitGate: "and" | "or";
  qualityUpgrade: boolean;
  enchantmentUpgrade: boolean;
  premium: boolean;
} {
  return {
    tier: parseInt(params.tier, 10) || undefined,
    minProfit: parseInt(params.minProfit, 10) || 0,
    minPercentualProfit: parseInt(params.minPercentualProfit, 10) || 0,
    profitGate: params.profitGate === "or" ? "or" : "and",
    qualityUpgrade: params.qualityUpgrade === "1",
    enchantmentUpgrade: params.enchantmentUpgrade === "1",
    premium: params.premium === "1",
  };
}

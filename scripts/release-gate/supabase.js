// Direct Supabase reads/writes for the dedicated validation token.
//
// The gate uses the same project the deployment uses (never a mock): it clears
// the token's rows before the golden replay, exports them for the fixture
// comparison through the checked-in mocker tooling, and verifies that the
// persisted data lives in Supabase rather than the Flipper container.
const { assertStatus, httpFetch } = require("./http.js");

function adminHeaders(config, extra = {}) {
  const key = config.supabase.serviceRoleKey;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

function ordersUrl(config, query) {
  return new URL(`/rest/v1/orders?${query}`, config.supabase.url);
}

async function countOrders(config) {
  const url = ordersUrl(config, "select=id&limit=1");
  const response = await httpFetch(url, {
    headers: adminHeaders(config, { Prefer: "count=exact" }),
  });
  assertStatus(response, 200, "Supabase orders count");

  const contentRange = response.headers.get("content-range") ?? "";
  const count = Number(contentRange.split("/").pop());
  if (!Number.isFinite(count)) {
    throw new Error("Supabase orders count did not return a row count");
  }
  return count;
}

async function countOrdersForToken(config, token) {
  const url = ordersUrl(
    config,
    `select=id&token=eq.${encodeURIComponent(token)}&limit=1`,
  );
  const response = await httpFetch(url, {
    headers: adminHeaders(config, { Prefer: "count=exact" }),
  });
  assertStatus(response, 200, "Supabase orders count");

  const contentRange = response.headers.get("content-range") ?? "";
  const count = Number(contentRange.split("/").pop());
  if (!Number.isFinite(count)) {
    throw new Error("Supabase orders count did not return a row count");
  }
  return count;
}

async function listOrderIdsForToken(config, token) {
  const url = ordersUrl(
    config,
    `select=id&token=eq.${encodeURIComponent(token)}&order=id.asc&limit=50`,
  );
  const response = await httpFetch(url, { headers: adminHeaders(config) });
  assertStatus(response, 200, "Supabase orders read");
  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Supabase orders read returned a non-array response");
  }
  return rows.map((row) => row.id);
}

async function deleteOrdersForToken(config, token) {
  const url = ordersUrl(config, `token=eq.${encodeURIComponent(token)}`);
  const response = await httpFetch(url, {
    method: "DELETE",
    headers: adminHeaders(config, { Prefer: "return=minimal" }),
  });
  assertStatus(response, [200, 204], "Supabase orders delete");
}

module.exports = {
  countOrders,
  countOrdersForToken,
  deleteOrdersForToken,
  listOrderIdsForToken,
};

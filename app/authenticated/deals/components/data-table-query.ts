export function updateDealSearchParams(
  currentSearchParams: string,
  updates: Record<string, string | null>,
) {
  const params = new URLSearchParams(currentSearchParams);

  Object.entries(updates).forEach(([name, value]) => {
    if (value === null) {
      params.delete(name);
    } else {
      params.set(name, value);
    }
  });

  return params.toString();
}

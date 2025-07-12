"use client";
import { useEffect, useState } from "react";

export default function TokenManager() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the user's token on mount
  useEffect(() => {
    fetch("/api/token/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.token) setToken(data.token);
      });
  }, []);

  const generateToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/token/generate", { method: "POST" });
      const data = await res.json();
      if (data.token) setToken(data.token);
      else setError("Failed to generate token");
    } catch (e) {
      setError("Failed to generate token");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">API Token</h1>
      {token ? (
        <div className="mb-4">
          <div className="font-mono break-all p-2 bg-gray-100 rounded">
            {token}
          </div>
        </div>
      ) : (
        <div className="mb-4 text-gray-500">No token generated yet.</div>
      )}
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={generateToken}
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate New Token"}
      </button>
      {error && <div className="mt-2 text-red-600">{error}</div>}
    </div>
  );
}

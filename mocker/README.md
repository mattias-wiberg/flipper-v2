# Mocker Scripts

This folder contains scripts for sending mock order data to your local API for testing and development purposes.

## Purpose

The `sendOrders.ts` script reads mock order data from `data/orders.json` and sends each order as a POST request to your local endpoint at:

```
http://localhost:3000/api/mocktoken/market.ingest
```

This is useful for populating your development environment with test data or simulating order ingestion.

## How to Run

1. Make sure you have Node.js v18 or newer (for built-in `fetch` support).
2. Ensure your local API server is running at `http://localhost:3000`.
3. From the project root, run:

```
npm run mock:order:ingest
```

This will execute the script and display a progress bar in your terminal, showing how many orders were sent and how many failed.

---

If you need to modify the mock data, edit `data/orders.json`.

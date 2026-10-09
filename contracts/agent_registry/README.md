# AgentRegistry (AI BORA)

A Soroban (Stellar) smart contract that registers AI-agent identities on-chain
and tracks **per-agent earnings**. Each agent stores its service catalog (a map
of service → price in micro-USDC) and a running total of what it has been paid.
It pairs with `PaymentSplitter` / `ProposalRegistry`: a payment flows through
the split, and the amount credited to an agent is recorded here.

## Contract Address (Stellar Testnet)

```
CCXDYLNIWJJB7VNTUWBWJOH26LUZOXKE24JWOPE7Y2E3MOTX2TC66T7M
```

Explorer: https://stellar.expert/explorer/testnet/contract/CCXDYLNIWJJB7VNTUWBWJOH26LUZOXKE24JWOPE7Y2E3MOTX2TC66T7M

## `AgentService` enum

The service catalog is keyed by this enum (prices are in micro-USDC, i.e.
`1 USDC = 1_000_000`):

| Variant | Meaning |
|---------|---------|
| `MarketingAnalysis` | Marketing / market analysis |
| `SalesScript` | Sales-script generation |
| `ContractDraft` | Contract / document drafting |
| `Custom` | Anything not in the above |

## `Agent` record

```rust
struct Agent {
    address: Address,
    name: String,
    services: Map<AgentService, i128>, // service -> price (micro-USDC)
    total_earned: i128,                // running total credited
    active: bool,                      // registered agents start true
}
```

## Public functions

| Function | Description |
|----------|-------------|
| `register_agent(agent, name, services)` | Create an agent with its service price map. `total_earned = 0`, `active = true`. Requires the agent's own auth. |
| `get_agent(agent) -> Option<Agent>` | Retrieve the full agent record. |
| `update_rates(agent, services)` | Replace the agent's service price map. No-op (no panic) if the agent does not exist. |
| `record_payment(payer, agent, amount)` | Credit `amount` to the agent's `total_earned`. Requires the payer's auth. |
| `deactivate_agent(agent)` | Set `active = false`, closing the payment path for that agent. The record is kept, not deleted. |
| `get_service_price(agent, service) -> i128` | The price for one service (0 if the agent or service is absent). |
| `get_total_earned(agent) -> i128` | The agent's running credited total (0 if absent). |

## How `record_payment` is intended to be called

`record_payment(payer, agent, amount)` is the entry point for crediting an
agent. In the normal flow the **payer is the admin who received the 70% admin
share** from `PaymentSplitter::execute_split`; that admin then calls
`record_payment` with the amount the agent is owed. The contract:

1. requires the **payer's** auth (`payer.require_auth()`);
2. rejects non-positive amounts (`amount <= 0` → `Invalid payment amount: must be positive`);
3. rejects paying a deactivated agent (`Agent is deactivated - cannot record payment`);
4. otherwise adds `amount` to `total_earned` and stores the agent back.

Direct calls (not via the splitter) are also valid - any address can credit any
registered, active agent it can authenticate as payer.

## Building

```bash
cargo build -p agent_registry
cargo test  -p agent_registry
```

The WASM artifact is produced under `target/wasm32v1-none/release/`.

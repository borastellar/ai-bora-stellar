# ProposalRegistry (AI BORA)

A Soroban (Stellar) smart contract that stores a client proposal on-chain:
it anchors the SHA-256 hash of the proposal PDF and tracks the proposal's
status through the sales cycle (`pending → accepted → paid → completed`, or
`pending → rejected`). It pairs with `PaymentSplitter` to move the money once
the proposal is paid.

## Contract Address (Stellar Testnet)

```
CBUTZRV7YSJAYQTVSP3NSEDW3URRVCH3WDJQOXYASYQRNZFSLSIGROU5
```

Explorer: https://stellar.expert/explorer/testnet/contract/CBUTZRV7YSJAYQTVSP3NSEDW3URRVCH3WDJQOXYASYQRNZFSLSIGROU5

## Function reference

See [CONTRACT.md](./CONTRACT.md) for the authoritative deployed-function table
and the WASM build hash/size. This README intentionally does **not** duplicate
that reference; it only adds the contract's purpose and its storage/TTL model.

In short, the public surface is:

- `store_proposal` - write a new proposal (client email, PDF hash, amount) as `pending`
- `get_proposal` / `get_status` / `get_created_at` - read the record, or just its status/timestamp
- `update_status` - move it through the validated status flow (guards against illegal transitions)
- `verify_hash` - constant-time check that a supplied hash matches the stored one
- `extend_proposal_ttl` / `proposal_exists` - storage lifecycle helpers

## Relationship to CONTRACT.md

- **`README.md` (this file)** - what the contract is, why it exists, TTL model.
- **`CONTRACT.md`** - the per-function reference and the exact deployed WASM
  hash/size for verification.
- **`src/lib.rs`** - the source of truth for behavior (including the TTL
  constants at the top of the file).

## PDF-hash anchoring

The client is asked for the SHA-256 of the proposal PDF at store time. The hash
is kept on-chain (not the file itself), so anyone can later confirm the
on-chain record corresponds to the exact PDF a buyer was shown, without the
contract holding the document. `verify_hash` performs a constant-time
comparison to avoid timing side-channels.

## TTL strategy

Soroban (Protocol 22) prunes instance storage when its ledger TTL lapses, so
the contract actively extends TTLs to keep proposals alive for realistic B2B
sales cycles:

- Constants (top of `src/lib.rs`): `TTL_THRESHOLD = 50_000`, `TTL_EXTEND =
  100_000`, `PAID_TTL_EXTEND = 200_000` (1 ledger ≈ 5 s; ~200 days ≈ 3.45M ledgers).
- `store_proposal` and `update_status` extend the instance-store TTL by ~200
  days on every write.
- A proposal that reaches `paid` is extended further (`PAID_TTL_EXTEND`) to
  preserve a longer audit trail.
- `extend_proposal_ttl` lets an admin re-extend all instance-storage records
  when one is getting close to expiry.

## Building

```bash
cargo build -p proposal_registry
cargo test  -p proposal_registry
```

The WASM artifact is produced under `target/wasm32v1-none/release/`.

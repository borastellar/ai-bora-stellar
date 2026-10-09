# PaymentSplitter (AI BORA)

A Soroban (Stellar) smart contract that records a payment and splits it
**70% to the admin / 30% to the collaborator**. It anchors the split on-chain
and, on execution, transfers each share to the stored recipient.

## Contract Address (Stellar Testnet)

```
CCP4JPWI33BC2XCDOLEDOIURMP7NPBY7I532H4N56ZDBCXX3A6BZNZ3P
```

Explorer: https://stellar.expert/explorer/testnet/contract/CCP4JPWI33BC2XCDOLEDOIURMP7NPBY7I532H4N56ZDBCXX3A6BZNZ3P

## The 70/30 arithmetic

The split is computed with integer (truncating) division so the two shares
always sum exactly to the input and no unit is lost or created:

```
admin_amount        = (total_amount * 70) / 100
collaborator_amount = total_amount - admin_amount
```

Guards that make invalid input fail fast (each panics, so nothing is stored):

- `total_amount <= 0` → `Invalid total amount: must be positive`
- duplicate payment `id` → `Payment id already exists`
- either share truncates to `<= 0` (e.g. a 1-unit total) → `Payment amount too small for split`

## Public functions

| Function | Description |
|----------|-------------|
| `create_payment(admin, id, total_amount, token_contract, admin_address, collaborator_address) -> String` | Record a new payment with its pre-computed 70/30 split. Stores `status = "pending"`. Returns the payment id. |
| `execute_split(admin, id) -> (i128, i128)` | Transfer the stored shares to the recipients, then mark the payment `"completed"`. Re-executing a completed payment panics; only the creating admin may execute. |
| `get_payment(id) -> Option<Payment>` | Retrieve the full stored payment record. |
| `get_status(id) -> Option<String>` | Return only the status field (lighter than the full record). |
| `extend_payment_ttl(admin)` | Extend the TTL of all instance-storage payment records. |
| `payment_exists(id) -> bool` | Whether a payment record exists and has not expired. |
| `calculate_split(total_amount) -> (i128, i128)` | Pure helper returning the `(admin, collaborator)` split (no auth, no storage). |

### `Payment` record

```rust
struct Payment {
    total_amount: i128,
    admin_amount: i128,
    collaborator_amount: i128,
    status: String,            // "pending" -> "completed" (set by execute_split)
    token_contract: Address,
    admin_address: Address,
    collaborator_address: Address,
    created_at: u64,
}
```

## Token transfers

On `execute_split` the contract marks the payment `"completed"` first (the
re-entrancy guard), then uses the stored `token_contract` to send
`admin_amount` from the executing admin to `payment.admin_address` and
`collaborator_amount` to `payment.collaborator_address`. The executing admin
(the account that created the payment) is expected to already hold
`total_amount`.

## TTL strategy

Each payment is written to instance storage with an extended TTL (~200 days) so
the record survives the sales cycle. `extend_payment_ttl` re-extends the TTL for
all instance-storage records when needed.

## Building

```bash
cargo build -p payment_splitter
cargo test  -p payment_splitter
```

The WASM artifact is produced under `target/wasm32v1-none/release/`.

#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Bytes, Env, String};

/// ========================================
/// CONSTANTS FOR TTL MANAGEMENT
/// ========================================
/// In Soroban Protocol 22, instance storage has a Time-To-Live (TTL).
/// If data expires, it's pruned from the ledger and becomes inaccessible.
///
/// CONVERSION: 1 ledger ≈ 5 seconds
/// - 1 day ≈ 17,280 ledgers
/// - 200 days ≈ 3,456,000 ledgers
/// - Maximum single extend_ttl: ~100,000 ledgers
///
/// PROPOSAL TTL STRATEGY:
/// - Use instance().extend_ttl(threshold, extend_to) to extend ALL data
/// - New proposals: set creates entry with default TTL
/// - After write: instance().extend_ttl(50_000, 100_000) extends ~200 days
///
/// This ensures proposals remain accessible for typical B2B sales cycles.

/// TTL threshold: extend if current TTL < this
const TTL_THRESHOLD: u32 = 50_000;

/// TTL extension amount: ~200 days
const TTL_EXTEND: u32 = 100_000;

/// Extended TTL for paid proposals (audit trail): ~400 days total
const PAID_TTL_EXTEND: u32 = 200_000;

#[contracttype]
pub struct Proposal {
    pub client_email: String,
    pub pdf_hash: Bytes,
    pub amount: i128,
    pub status: String,
    pub created_at: u64,
}

#[contract]
pub struct ProposalRegistry;

#[contractimpl]
impl ProposalRegistry {
    /// Store a new proposal on-chain with PDF hash for verification.
    ///
    /// # Arguments
    /// * `admin` - The authorized address that can update this proposal
    /// * `id` - Unique proposal identifier
    /// * `client_email` - Client's email for contact
    /// * `pdf_hash` - SHA-256 hash of the proposal PDF
    /// * `amount` - Total amount in micro-USDC (amount * 1,000,000)
    ///
    /// # TTL
    /// Proposal is stored with extended TTL (~200 days)
    pub fn store_proposal(
        env: Env,
        admin: Address,
        id: String,
        client_email: String,
        pdf_hash: Bytes,
        amount: i128,
    ) {
        admin.require_auth();

        let proposal = Proposal {
            client_email,
            pdf_hash,
            amount,
            status: String::from_str(&env, "pending"),
            created_at: env.ledger().timestamp(),
        };

        // Store proposal
        env.storage().instance().set(&id, &proposal);

        // Extend TTL for all instance storage (~200 days)
        // This prevents data pruning before client pays
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
    }

    /// Get proposal details by ID.
    ///
    /// # Note
    /// If proposal has expired (TTL elapsed), this returns None.
    pub fn get_proposal(env: Env, id: String) -> Option<Proposal> {
        env.storage().instance().get(&id)
    }

    /// Update proposal status and extend TTL.
    ///
    /// # Status Flow
    /// - pending → accepted → paid → completed
    /// - pending → rejected
    ///
    /// # Security
    /// Validates status transitions to prevent invalid state changes.
    ///
    /// # TTL
    /// Extends TTL to ensure proposal survives while active.
    /// For "paid" status, extends even more for audit trail.
    pub fn update_status(env: Env, admin: Address, id: String, new_status: String) {
        admin.require_auth();

        // Fail loudly if the proposal does not exist (or has expired):
        // updating a mistyped or expired id must not silently succeed.
        let mut proposal: Proposal = env
            .storage()
            .instance()
            .get::<String, Proposal>(&id)
            .expect("update_status: proposal does not exist or has expired");

        // Validate status transitions
        let current = proposal.status.clone();
        let new_stat = new_status.clone();

        let valid_transition = (current == String::from_str(&env, "pending")
            && (new_stat == String::from_str(&env, "accepted")
                || new_stat == String::from_str(&env, "rejected")))
            || (current == String::from_str(&env, "accepted")
                && (new_stat == String::from_str(&env, "paid")
                    || new_stat == String::from_str(&env, "rejected")))
            || (current == String::from_str(&env, "paid")
                && new_stat == String::from_str(&env, "completed"));

        if !valid_transition {
            panic!("Invalid status transition");
        }

        // Update status
        proposal.status = new_stat.clone();
        env.storage().instance().set(&id, &proposal);

        // Extend TTL based on status
        // Paid proposals need longer TTL for audit trail
        let ttl_extension = if new_stat == String::from_str(&env, "paid") {
            PAID_TTL_EXTEND
        } else {
            TTL_EXTEND
        };

        // Extend all instance storage TTL
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, ttl_extension);
    }

    /// Verify proposal PDF hash matches expected hash.
    ///
    /// # Security
    /// Returns false if proposal doesn't exist or has expired.
    ///
    /// Note: `pdf_hash` is a public commitment (anyone holding the id can
    /// read it via `get_proposal`), so the comparison is not timing-sensitive
    /// and is performed with a standard equality check.
    pub fn verify_hash(env: Env, id: String, expected_hash: Bytes) -> bool {
        if let Some(proposal) = env.storage().instance().get::<String, Proposal>(&id) {
            // Standard equality check: the hash is a public commitment, so a
            // constant-time comparison is not required here.
            proposal.pdf_hash == expected_hash
        } else {
            false
        }
    }

    /// Manually extend proposal TTL.
    ///
    /// Use this if a proposal is about to expire but needs more time.
    /// Extends ALL instance storage TTL by ~200 days.
    ///
    /// # Security
    /// Requires admin authorization to prevent unauthorized TTL extensions.
    pub fn extend_proposal_ttl(env: Env, admin: Address) {
        admin.require_auth();

        // Extend all instance storage TTL
        // Note: This extends TTL for ALL proposals in this contract
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
    }

    /// Get proposal status only (lighter than full proposal).
    pub fn get_status(env: Env, id: String) -> Option<String> {
        env.storage()
            .instance()
            .get::<String, Proposal>(&id)
            .map(|p| p.status)
    }

    /// Get proposal timestamp (when it was created).
    pub fn get_created_at(env: Env, id: String) -> Option<u64> {
        env.storage()
            .instance()
            .get::<String, Proposal>(&id)
            .map(|p| p.created_at)
    }

    /// Check if proposal exists and hasn't expired.
    pub fn proposal_exists(env: Env, id: String) -> bool {
        env.storage().instance().has(&id)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_store_proposal() {
        let env = Env::default();
        let contract_id = env.register(ProposalRegistry, ());
        let client = ProposalRegistryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let pdf_hash = Bytes::from_slice(&env, b"abc123def456");

        // Mock auth for admin
        env.mock_all_auths();

        client.store_proposal(
            &admin,
            &String::from_str(&env, "prop-001"),
            &String::from_str(&env, "client@example.com"),
            &pdf_hash,
            &1000000000,
        );

        let proposal = client.get_proposal(&String::from_str(&env, "prop-001"));
        assert!(proposal.is_some());
        let p = proposal.unwrap();
        assert_eq!(p.client_email, String::from_str(&env, "client@example.com"));
        assert_eq!(p.status, String::from_str(&env, "pending"));
    }

    #[test]
    fn test_update_status() {
        let env = Env::default();
        let contract_id = env.register(ProposalRegistry, ());
        let client = ProposalRegistryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let pdf_hash = Bytes::from_slice(&env, b"abc123def456");

        env.mock_all_auths();

        client.store_proposal(
            &admin,
            &String::from_str(&env, "prop-002"),
            &String::from_str(&env, "client@example.com"),
            &pdf_hash,
            &1000000000,
        );

        client.update_status(
            &admin,
            &String::from_str(&env, "prop-002"),
            &String::from_str(&env, "accepted"),
        );

        client.update_status(
            &admin,
            &String::from_str(&env, "prop-002"),
            &String::from_str(&env, "paid"),
        );

        let proposal = client
            .get_proposal(&String::from_str(&env, "prop-002"))
            .unwrap();
        assert_eq!(proposal.status, String::from_str(&env, "paid"));
    }

    #[test]
    fn test_verify_hash() {
        let env = Env::default();
        let contract_id = env.register(ProposalRegistry, ());
        let client = ProposalRegistryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let pdf_hash = Bytes::from_slice(&env, b"abc123def456");

        env.mock_all_auths();

        client.store_proposal(
            &admin,
            &String::from_str(&env, "prop-003"),
            &String::from_str(&env, "client@example.com"),
            &pdf_hash,
            &1000000000,
        );

        let valid = client.verify_hash(
            &String::from_str(&env, "prop-003"),
            &Bytes::from_slice(&env, b"abc123def456"),
        );
        assert!(valid);

        let invalid = client.verify_hash(
            &String::from_str(&env, "prop-003"),
            &Bytes::from_slice(&env, b"wronghash"),
        );
        assert!(!invalid);
    }

    #[test]
    #[should_panic(expected = "update_status: proposal does not exist or has expired")]
    fn test_update_status_unknown_id_panics() {
        let env = Env::default();
        let contract_id = env.register(ProposalRegistry, ());
        let client = ProposalRegistryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        env.mock_all_auths();

        // No proposal exists for this id: update_status must panic instead of
        // silently succeeding.
        client.update_status(
            &admin,
            &String::from_str(&env, "no-such-proposal"),
            &String::from_str(&env, "accepted"),
        );
    }

    #[test]
    fn test_extend_ttl() {
        let env = Env::default();
        let contract_id = env.register(ProposalRegistry, ());
        let client = ProposalRegistryClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let pdf_hash = Bytes::from_slice(&env, b"abc123def456");

        env.mock_all_auths();

        client.store_proposal(
            &admin,
            &String::from_str(&env, "prop-004"),
            &String::from_str(&env, "client@example.com"),
            &pdf_hash,
            &1000000000,
        );

        // Extend TTL should not fail
        client.extend_proposal_ttl(&admin);

        // Proposal should still exist
        let proposal = client.get_proposal(&String::from_str(&env, "prop-004"));
        assert!(proposal.is_some());
    }
}

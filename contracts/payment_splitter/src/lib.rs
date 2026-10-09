#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String};

/// ========================================
/// CONSTANTS FOR TTL MANAGEMENT
/// ========================================
///
/// PAYMENT SPLITTER TTL STRATEGY:
/// - Use instance().extend_ttl(threshold, extend_to) to extend ALL data
/// - New payments: extended ~200 days to allow time for settlement
/// - Completed payments: extended ~400 days for audit trail
///
/// RATIONALE:
/// - B2B payments can take days to weeks
/// - Completed payments need long retention for financial audit
/// - Audit requirements usually mandate 1-7 years of records

/// TTL threshold: extend if current TTL < this
const TTL_THRESHOLD: u32 = 50_000;

/// TTL extension amount: ~200 days
const TTL_EXTEND: u32 = 100_000;

/// Additional TTL for completed payments (audit trail)
/// ~400 days total for audit compliance
const COMPLETED_TTL_EXTEND: u32 = 200_000;

#[contracttype]
pub struct Payment {
    pub total_amount: i128,
    pub admin_amount: i128,
    pub collaborator_amount: i128,
    pub status: String,
    pub token_contract: Address,
    pub admin_address: Address,
    pub collaborator_address: Address,
    pub created_at: u64,
}

#[contract]
pub struct PaymentSplitter;

#[contractimpl]
impl PaymentSplitter {
    /// Create a new payment record with 70/30 split calculation.
    ///
    /// # Arguments
    /// * `admin` - The authorized admin address
    /// * `id` - Unique payment identifier
    /// * `total_amount` - Total amount in micro-units (amount * 10^decimals)
    /// * `token_contract` - Address of the token contract (USDC, XLM, etc.)
    /// * `admin_address` - Where to send the 70% share
    /// * `collaborator_address` - Where to send the 30% share
    ///
    /// # TTL
    /// Payment is stored with extended TTL (~200 days)
    ///
    /// # Returns
    /// The payment ID
    pub fn create_payment(
        env: Env,
        admin: Address,
        id: String,
        total_amount: i128,
        token_contract: Address,
        admin_address: Address,
        collaborator_address: Address,
    ) -> String {
        admin.require_auth();

        // Calculate split: admin gets 70%, collaborator gets remainder
        let admin_amt = (total_amount * 70) / 100;
        let collab_amt = total_amount - admin_amt;

        // Validate amounts
        if admin_amt <= 0 || collab_amt <= 0 {
            panic!("Payment amount too small for split");
        }

        let payment = Payment {
            total_amount,
            admin_amount: admin_amt,
            collaborator_amount: collab_amt,
            status: String::from_str(&env, "pending"),
            token_contract: token_contract.clone(),
            admin_address: admin_address.clone(),
            collaborator_address: collaborator_address.clone(),
            created_at: env.ledger().timestamp(),
        };

        env.storage().instance().set(&id, &payment);

        // Extend TTL for all instance storage (~200 days)
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);

        id
    }

    /// Execute the 70/30 split by transferring tokens to recipients.
    ///
    /// # SECURITY
    /// - Checks for re-execution (idempotent)
    /// - Updates status BEFORE transfer (checks-effects-interactions)
    /// - Validates amounts are positive
    ///
    /// # FLOW
    /// 1. Admin calls create_payment() - creates payment record
    /// 2. Admin transfers tokens TO this contract (or approves spending)
    /// 3. Admin calls execute_split() - distributes tokens
    ///
    /// # TTL
    /// Extends TTL to ~400 days for audit compliance
    pub fn execute_split(env: Env, admin: Address, id: String) -> (i128, i128) {
        // ========================================
        // 1. AUTHORIZATION CHECK
        // ========================================
        admin.require_auth();

        // ========================================
        // 2. LOAD AND VALIDATE PAYMENT (CHECKS)
        // ========================================
        let mut payment: Payment = env
            .storage()
            .instance()
            .get(&id)
            .expect("Payment not found");

        // Reentrancy guard: prevent double execution
        if payment.status == String::from_str(&env, "completed") {
            panic!("Payment already executed - cannot split again");
        }

        // Validate that payment was created by authorized admin
        if payment.admin_address != admin {
            panic!("Only the admin who created this payment can execute it");
        }

        // Validate amounts
        if payment.admin_amount <= 0 {
            panic!("Invalid admin amount: must be positive");
        }
        if payment.collaborator_amount <= 0 {
            panic!("Invalid collaborator amount: must be positive");
        }

        // ========================================
        // 3. UPDATE STATE FIRST (EFFECTS)
        // ========================================
        // Mark as completed BEFORE transfers to prevent reentrancy
        payment.status = String::from_str(&env, "completed");
        env.storage().instance().set(&id, &payment);

        // Extend TTL for audit trail (~400 days total)
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, COMPLETED_TTL_EXTEND);

        // ========================================
        // 4. TRANSFER TOKENS (INTERACTIONS)
        // ========================================
        let token_client = token::Client::new(&env, &payment.token_contract);

        // Transfer admin's 70% share
        token_client.transfer(&admin, &payment.admin_address, &payment.admin_amount);

        // Transfer collaborator's 30% share
        token_client.transfer(
            &admin,
            &payment.collaborator_address,
            &payment.collaborator_amount,
        );

        // ========================================
        // 5. RETURN RESULT
        // ========================================
        (payment.admin_amount, payment.collaborator_amount)
    }

    /// Get payment details by ID.
    pub fn get_payment(env: Env, id: String) -> Option<Payment> {
        env.storage().instance().get(&id)
    }

    /// Get payment status only.
    pub fn get_status(env: Env, id: String) -> Option<String> {
        env.storage()
            .instance()
            .get::<String, Payment>(&id)
            .map(|p| p.status)
    }

    /// Manually extend payment TTL.
    ///
    /// Extends ALL instance storage TTL by ~200 days.
    ///
    /// # Security
    /// Requires admin authorization to prevent unauthorized TTL extensions.
    pub fn extend_payment_ttl(env: Env, admin: Address) {
        admin.require_auth();

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
    }

    /// Check if payment exists and hasn't expired.
    pub fn payment_exists(env: Env, id: String) -> bool {
        env.storage().instance().has(&id)
    }

    /// Calculate split amounts without creating payment.
    ///
    /// Useful for UI to show exact amounts before creating payment.
    pub fn calculate_split(total_amount: i128) -> (i128, i128) {
        let admin_amt = (total_amount * 70) / 100;
        let collab_amt = total_amount - admin_amt;
        (admin_amt, collab_amt)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_create_payment() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let admin_receiver = Address::generate(&env);
        let collaborator = Address::generate(&env);

        env.mock_all_auths();

        let payment_id = client.create_payment(
            &admin,
            &String::from_str(&env, "pay-001"),
            &1000000000,
            &token,
            &admin_receiver,
            &collaborator,
        );

        let payment = client
            .get_payment(&String::from_str(&env, "pay-001"))
            .unwrap();

        assert_eq!(payment.total_amount, 1000000000);
        assert_eq!(payment.admin_amount, 700000000);
        assert_eq!(payment.collaborator_amount, 300000000);
        assert_eq!(payment.status, String::from_str(&env, "pending"));
    }

    #[test]
    fn test_70_30_split_precision() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let admin_receiver = Address::generate(&env);
        let collaborator = Address::generate(&env);

        env.mock_all_auths();

        // Test with prime number - remainder must go to collaborator
        client.create_payment(
            &admin,
            &String::from_str(&env, "pay-003"),
            &1234567891,
            &token,
            &admin_receiver,
            &collaborator,
        );

        let payment = client
            .get_payment(&String::from_str(&env, "pay-003"))
            .unwrap();

        assert_eq!(
            payment.admin_amount + payment.collaborator_amount,
            payment.total_amount,
            "Split amounts must sum to total"
        );
        assert_eq!(payment.admin_amount, (1234567891 * 70) / 100);
        assert_eq!(
            payment.collaborator_amount,
            1234567891 - payment.admin_amount
        );
    }

    #[test]
    fn test_extend_payment_ttl() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let admin_receiver = Address::generate(&env);
        let collaborator = Address::generate(&env);

        env.mock_all_auths();

        client.create_payment(
            &admin,
            &String::from_str(&env, "pay-004"),
            &1000000000,
            &token,
            &admin_receiver,
            &collaborator,
        );

        client.extend_payment_ttl(&admin);

        assert!(client.payment_exists(&String::from_str(&env, "pay-004")));
    }

    #[test]
    fn test_execute_split_transfers() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let collaborator = Address::generate(&env);

        // Register a real Stellar asset contract so token_client.transfer
        // exercises the actual token interface, not a stub.
        let issuer = soroban_sdk::Address::generate(&env);
        let asset = env.register_stellar_asset_contract_v2(issuer);
        let asset_client = token::Client::new(&env, &asset.address());
        let token = asset.address();

        let total: i128 = 1_000_000_000;
        env.mock_all_auths();

        // Fund the admin (the transfer source in execute_split).
        let minter = soroban_sdk::token::StellarAssetClient::new(&env, &token);
        minter.mint(&admin, &total);
        assert_eq!(asset_client.balance(&admin), total);
        assert_eq!(asset_client.balance(&collaborator), 0);

        let payment_id = client.create_payment(
            &admin,
            &String::from_str(&env, "pay-exec-001"),
            &total,
            &token,
            &admin,
            &collaborator,
        );

        // Payment must be pending and stored with the paying admin as the
        // 70% recipient (execute_split transfers FROM the admin TO the admin's
        // own address + the collaborator).
        let p0 = client.get_payment(&String::from_str(&env, "pay-exec-001")).unwrap();
        assert_eq!(p0.admin_address, admin, "stored 70% recipient must be the paying admin");
        assert_eq!(p0.status, String::from_str(&env, "pending"));

        let (admin_amt, collab_amt) = client.execute_split(&admin, &payment_id);
        assert_eq!(admin_amt, 700_000_000, "admin must receive 70%");
        assert_eq!(collab_amt, 300_000_000, "collaborator must receive 30%");

        // Recipient balances: admin nets back their 70% (transferred to their
        // own address), collaborator receives the 30%.
        assert_eq!(
            asset_client.balance(&admin),
            700_000_000,
            "paying admin holds their 70% share"
        );
        assert_eq!(
            asset_client.balance(&collaborator),
            300_000_000,
            "collaborator holds 30%"
        );

        // Payment must be marked completed.
        let payment = client
            .get_payment(&String::from_str(&env, "pay-exec-001"))
            .unwrap();
        assert_eq!(payment.status, String::from_str(&env, "completed"));
    }

    #[test]
    #[should_panic(expected = "Payment already executed - cannot split again")]
    fn test_execute_split_is_not_repeatable() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let collaborator = Address::generate(&env);

        let issuer = soroban_sdk::Address::generate(&env);
        let asset = env.register_stellar_asset_contract_v2(issuer);
        let token = asset.address();
        let total: i128 = 1_000_000_000;
        env.mock_all_auths();

        // A real first split must succeed so the repeat-call guard, not a
        // missing payment, is what panics on the second call.
        let minter = soroban_sdk::token::StellarAssetClient::new(&env, &token);
        minter.mint(&admin, &total);
        let payment_id = client.create_payment(
            &admin,
            &String::from_str(&env, "pay-once-001"),
            &total,
            &token,
            &admin,
            &collaborator,
        );
        let (admin_amt, collab_amt) = client.execute_split(&admin, &payment_id);
        assert_eq!(admin_amt, 700_000_000);
        assert_eq!(collab_amt, 300_000_000);

        // Second execution must be rejected by the reentrancy guard.
        client.execute_split(&admin, &payment_id);
    }

    #[test]
    #[should_panic(expected = "Only the admin who created this payment can execute it")]
    fn test_only_creating_admin_can_execute_split() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);

        let creating_admin = Address::generate(&env);
        let impostor = Address::generate(&env);
        let collaborator = Address::generate(&env);

        let issuer = soroban_sdk::Address::generate(&env);
        let asset = env.register_stellar_asset_contract_v2(issuer);
        let token = asset.address();
        let total: i128 = 1_000_000_000;
        env.mock_all_auths();

        // Payment is stored with creating_admin as the 70% recipient.
        let minter = soroban_sdk::token::StellarAssetClient::new(&env, &token);
        minter.mint(&creating_admin, &total);
        let payment_id = client.create_payment(
            &creating_admin,
            &String::from_str(&env, "pay-auth-001"),
            &total,
            &token,
            &creating_admin,
            &collaborator,
        );

        // The stored admin is the creating admin, NOT the impostor.
        let p0 = client
            .get_payment(&String::from_str(&env, "pay-auth-001"))
            .unwrap();
        assert_eq!(p0.admin_address, creating_admin);
        assert_ne!(p0.admin_address, impostor);

        // An address other than the creating admin cannot execute the split.
        // require_auth is mocked, so it is the stored-admin comparison (not the
        // auth check) that rejects this caller.
        client.execute_split(&impostor, &payment_id);
    }

    #[test]
    #[should_panic(expected = "Payment amount too small for split")]
    fn test_create_payment_rejects_zero_share_total() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let collaborator = Address::generate(&env);
        let token = Address::generate(&env);
        env.mock_all_auths();

        // Boundary: 1 micro-unit truncates the 70% admin share to 0
        // ((1 * 70) / 100 == 0), so create_payment must reject it.
        client.create_payment(
            &admin,
            &String::from_str(&env, "pay-tiny-001"),
            &1,
            &token,
            &admin,
            &collaborator,
        );
    }

    #[test]
    fn test_calculate_split() {
        let (admin, collab) = PaymentSplitter::calculate_split(1000000000);
        assert_eq!(admin, 700000000);
        assert_eq!(collab, 300000000);

        let (admin2, collab2) = PaymentSplitter::calculate_split(99);
        assert_eq!(admin2 + collab2, 99);
        assert_eq!(admin2, 69);
        assert_eq!(collab2, 30);
    }
    #[test]
    #[should_panic(expected = "Payment amount too small for split")]
    fn test_create_payment_rejects_zero_share_total() {
    #[should_panic(expected = "Only the admin who created this payment can execute it")]
    fn test_only_creating_admin_can_execute_split() {
    #[should_panic(expected = "Payment already executed - cannot split again")]
    fn test_execute_split_is_not_repeatable() {
        let env = Env::default();
        let contract_id = env.register(PaymentSplitter, ());
        let client = PaymentSplitterClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let collaborator = Address::generate(&env);
        let token = Address::generate(&env);
        env.mock_all_auths();

        // Boundary: 1 micro-unit truncates the 70% admin share to 0
        // ((1 * 70) / 100 == 0), so create_payment must reject it.
        client.create_payment(
            &admin,
            &String::from_str(&env, "pay-tiny-001"),
            &1,
            &token,
            &admin,
            &collaborator,
        );
        let creating_admin = Address::generate(&env);
        let impostor = Address::generate(&env);
        let collaborator = Address::generate(&env);

        let issuer = soroban_sdk::Address::generate(&env);
        let asset = env.register_stellar_asset_contract_v2(issuer);
        let token = asset.address();
        let total: i128 = 1_000_000_000;
        env.mock_all_auths();

        // Payment is stored with creating_admin as the 70% recipient.
        let minter = soroban_sdk::token::StellarAssetClient::new(&env, &token);
        minter.mint(&creating_admin, &total);
        let payment_id = client.create_payment(
            &creating_admin,
            &String::from_str(&env, "pay-auth-001"),
            &total,
            &token,
            &creating_admin,
            &collaborator,
        );

        // The stored admin is the creating admin, NOT the impostor.
        let p0 = client
            .get_payment(&String::from_str(&env, "pay-auth-001"))
            .unwrap();
        assert_eq!(p0.admin_address, creating_admin);
        assert_ne!(p0.admin_address, impostor);

        // An address other than the creating admin cannot execute the split.
        // require_auth is mocked, so it is the stored-admin comparison (not the
        // auth check) that rejects this caller.
        client.execute_split(&impostor, &payment_id);
        // A real first split must succeed so the repeat-call guard, not a
        // missing payment, is what panics on the second call.
        let minter = soroban_sdk::token::StellarAssetClient::new(&env, &token);
        minter.mint(&admin, &total);
        let payment_id = client.create_payment(
            &admin,
            &String::from_str(&env, "pay-once-001"),
            &total,
            &token,
            &admin,
            &collaborator,
        );
        let (admin_amt, collab_amt) = client.execute_split(&admin, &payment_id);
        assert_eq!(admin_amt, 700_000_000);
        assert_eq!(collab_amt, 300_000_000);

        // Second execution must be rejected by the reentrancy guard.
        client.execute_split(&admin, &payment_id);
    }
}

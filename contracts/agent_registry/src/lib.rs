#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String};

#[contracttype]
pub enum AgentService {
    MarketingAnalysis,
    SalesScript,
    ContractDraft,
    Custom,
}

#[contracttype]
pub struct Agent {
    pub address: Address,
    pub name: String,
    pub services: Map<AgentService, i128>, // Service -> Price in USDC (stroops)
    pub total_earned: i128,
    pub active: bool,
}

#[contract]
pub struct AgentRegistry;

#[contractimpl]
impl AgentRegistry {
    /// Register a new agent with their services and rates
    pub fn register_agent(
        env: Env,
        agent: Address,
        name: String,
        services: Map<AgentService, i128>,
    ) {
        agent.require_auth();

        let agent_data = Agent {
            address: agent.clone(),
            name,
            services,
            total_earned: 0,
            active: true,
        };

        env.storage().instance().set(&agent, &agent_data);
    }

    /// Get agent information
    pub fn get_agent(env: Env, agent: Address) -> Option<Agent> {
        env.storage().instance().get(&agent)
    }

    /// Update agent's service rates
    pub fn update_rates(env: Env, agent: Address, services: Map<AgentService, i128>) {
        agent.require_auth();

        if let Some(mut agent_data) = env.storage().instance().get::<Address, Agent>(&agent) {
            agent_data.services = services;
            env.storage().instance().set(&agent, &agent_data);
        }
    }

    /// Record a payment to an agent (called by PaymentSplitter or directly)
    pub fn record_payment(env: Env, payer: Address, agent: Address, amount: i128) {
        payer.require_auth();

        // Reject non-positive amounts: the ledger is the source of truth for
        // per-agent earnings, so negative or zero values would corrupt it.
        if amount <= 0 {
            panic!("Invalid payment amount: must be positive");
        }

        if let Some(mut agent_data) = env.storage().instance().get::<Address, Agent>(&agent) {
            // Deactivation is meant to close the payment path for this agent;
            // paying a deactivated agent would defeat the active flag.
            if !agent_data.active {
                panic!("Agent is deactivated - cannot record payment");
            }
            agent_data.total_earned += amount;
            env.storage().instance().set(&agent, &agent_data);
        }
    }

    /// Deactivate an agent
    pub fn deactivate_agent(env: Env, agent: Address) {
        agent.require_auth();

        if let Some(mut agent_data) = env.storage().instance().get::<Address, Agent>(&agent) {
            agent_data.active = false;
            env.storage().instance().set(&agent, &agent_data);
        }
    }

    /// Get price for a specific service from an agent
    pub fn get_service_price(env: Env, agent: Address, service: AgentService) -> i128 {
        if let Some(agent_data) = env.storage().instance().get::<Address, Agent>(&agent) {
            agent_data.services.get(service).unwrap_or(0)
        } else {
            0
        }
    }

    /// Calculate total earned by agent
    pub fn get_total_earned(env: Env, agent: Address) -> i128 {
        if let Some(agent_data) = env.storage().instance().get::<Address, Agent>(&agent) {
            agent_data.total_earned
        } else {
            0
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    #[test]
    fn test_register_agent() {
        let env = Env::default();
        let contract_id = env.register(AgentRegistry, ());
        let client = AgentRegistryClient::new(&env, &contract_id);

        let agent_addr = Address::generate(&env);
        let mut services = Map::new(&env);
        services.set(AgentService::MarketingAnalysis, 1000000); // 0.1 USDC
        services.set(AgentService::SalesScript, 500000); // 0.05 USDC

        env.mock_all_auths();

        client.register_agent(
            &agent_addr,
            &String::from_str(&env, "AI Agent Alpha"),
            &services,
        );

        let agent = client.get_agent(&agent_addr).unwrap();
        assert_eq!(agent.name, String::from_str(&env, "AI Agent Alpha"));
        assert_eq!(agent.total_earned, 0);
        assert!(agent.active);
    }

    #[test]
    fn test_record_payment() {
        let env = Env::default();
        let contract_id = env.register(AgentRegistry, ());
        let client = AgentRegistryClient::new(&env, &contract_id);

        let agent_addr = Address::generate(&env);
        let payer = Address::generate(&env);
        let services = Map::new(&env);

        env.mock_all_auths();
        env.mock_all_auths();

        client.register_agent(
            &agent_addr,
            &String::from_str(&env, "AI Agent Beta"),
            &services,
        );

        client.record_payment(&payer, &agent_addr, &5000000);

        let total = client.get_total_earned(&agent_addr);
        assert_eq!(total, 5000000);

        let agent = client.get_agent(&agent_addr).unwrap();
        assert_eq!(agent.total_earned, 5000000);
    }

    #[test]
    fn test_deactivate_agent() {
    fn test_update_rates() {
        let env = Env::default();
        let contract_id = env.register(AgentRegistry, ());
        let client = AgentRegistryClient::new(&env, &contract_id);

        let agent_addr = Address::generate(&env);
        let services = Map::new(&env);

        env.mock_all_auths();

        client.register_agent(&agent_addr, &String::from_str(&env, "AI Agent Deact"), &services);

        // Registered agents start active.
        assert!(client.get_agent(&agent_addr).unwrap().active);

        client.deactivate_agent(&agent_addr);

        // active is now false; the record still exists (we did not delete it).
        let agent = client.get_agent(&agent_addr).unwrap();
        assert!(!agent.active);
    }

    #[test]
    fn test_missing_agent_getters_return_zero() {
        let env = Env::default();
        let contract_id = env.register(AgentRegistry, ());
        let client = AgentRegistryClient::new(&env, &contract_id);

        // An address that was never registered: both getters return 0.
        let stranger = Address::generate(&env);
        assert_eq!(client.get_total_earned(&stranger), 0);
        assert_eq!(client.get_service_price(&stranger, &AgentService::MarketingAnalysis), 0);
        let mut services = Map::new(&env);
        services.set(AgentService::MarketingAnalysis, 1000000); // 0.1 USDC

        env.mock_all_auths();

        client.register_agent(
            &agent_addr,
            &String::from_str(&env, "AI Agent Rates"),
            &services,
        );

        // Sanity: original price is what we registered.
        assert_eq!(
            client.get_service_price(&agent_addr, &AgentService::MarketingAnalysis),
            1000000
        );

        // Update rates to a different map (new price + a new service).
        let mut new_services = Map::new(&env);
        new_services.set(AgentService::MarketingAnalysis, 2500000); // 0.25 USDC
        new_services.set(AgentService::SalesScript, 750000); // 0.075 USDC

        client.update_rates(&agent_addr, &new_services);

        // get_service_price reflects the rewritten map.
        assert_eq!(
            client.get_service_price(&agent_addr, &AgentService::MarketingAnalysis),
            2500000
        );
        assert_eq!(
            client.get_service_price(&agent_addr, &AgentService::SalesScript),
            750000
        );

        // update_rates on an unregistered agent is a silent no-op: no panic.
        let stranger = Address::generate(&env);
        client.update_rates(&stranger, &new_services);
        assert!(client.get_agent(&stranger).is_none());
    }

    #[test]
    fn test_service_prices() {
        let env = Env::default();
        let contract_id = env.register(AgentRegistry, ());
        let client = AgentRegistryClient::new(&env, &contract_id);

        let agent_addr = Address::generate(&env);
        let mut services = Map::new(&env);
        services.set(AgentService::ContractDraft, 2000000); // 0.2 USDC

        env.mock_all_auths();

        client.register_agent(&agent_addr, &String::from_str(&env, "Legal AI"), &services);

        let price = client.get_service_price(&agent_addr, &AgentService::ContractDraft);
        assert_eq!(price, 2000000);
    }
    #[test]
    #[should_panic(expected = "Agent is deactivated - cannot record payment")]
    fn test_record_payment_rejects_deactivated_agent() {
    #[should_panic(expected = "Invalid payment amount: must be positive")]
    fn test_record_payment_rejects_negative_amount() {
        let env = Env::default();
        let contract_id = env.register(AgentRegistry, ());
        let client = AgentRegistryClient::new(&env, &contract_id);

        let agent_addr = Address::generate(&env);
        let payer = Address::generate(&env);
        let services = Map::new(&env);

        env.mock_all_auths();

        client.register_agent(&agent_addr, &String::from_str(&env, "Deact"), &services);
        client.deactivate_agent(&agent_addr);

        // The active check fires before any state write, so the rejection
        // leaves earnings unchanged.
        client.record_payment(&payer, &agent_addr, &5000000);
        client.register_agent(&agent_addr, &String::from_str(&env, "Neg"), &services);

        client.record_payment(&payer, &agent_addr, &-5000);

        assert_eq!(client.get_total_earned(&agent_addr), 0);
    }
}

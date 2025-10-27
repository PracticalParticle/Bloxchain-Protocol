const BareBlox = artifacts.require("BareBlox");
const StateAbstraction = artifacts.require("StateAbstraction");
const StateAbstractionDefinitions = artifacts.require("StateAbstractionDefinitions");

contract("BareBlox", function (accounts) {
  let bareBlox;
  const [owner, broadcaster, recovery, user] = accounts;
  const timeLockPeriodSec = 3600; // 1 hour
  const eventForwarder = "0x0000000000000000000000000000000000000000";

  beforeEach(async function () {
    // Link required libraries
    await BareBlox.link(StateAbstraction);
    await BareBlox.link(StateAbstractionDefinitions);
    
    // Deploy BareBlox
    bareBlox = await BareBlox.new();
    await bareBlox.initialize(
      owner,
      broadcaster,
      recovery,
      timeLockPeriodSec,
      eventForwarder
    );
  });

  describe("Initialization", function () {
    it("should initialize successfully", async function () {
      const isInitialized = await bareBlox.initialized();
      assert.isTrue(isInitialized, "Contract should be initialized");
    });

    it("should set correct time lock period", async function () {
      const timeLock = await bareBlox.getTimeLockPeriodSec();
      assert.equal(timeLock.toString(), timeLockPeriodSec.toString(), "Time lock period should be set correctly");
    });

    it("should assign owner role correctly", async function () {
      const OWNER_ROLE = "0x542ebd056dcb61d328d2ae572dc534147e13901e8b9f46a60701f85bee10689c";
      const hasOwnerRole = await bareBlox.hasRole(OWNER_ROLE, owner);
      assert.isTrue(hasOwnerRole, "Owner should have owner role");
    });
  });

  describe("BaseStateMachine Functionality", function () {
    it("should return supported operation types", async function () {
      const operationTypes = await bareBlox.getSupportedOperationTypes();
      assert.isArray(operationTypes, "Should return array of operation types");
    });

    it("should return supported roles", async function () {
      const roles = await bareBlox.getSupportedRoles();
      assert.isArray(roles, "Should return array of roles");
    });

    it("should return supported functions", async function () {
      const functions = await bareBlox.getSupportedFunctions();
      assert.isArray(functions, "Should return array of functions");
    });

    it("should return empty transaction history initially", async function () {
      const history = await bareBlox.getTransactionHistory(1, 10);
      assert.equal(history.length, 0, "Transaction history should be empty initially");
    });

    it("should return empty pending transactions initially", async function () {
      const pending = await bareBlox.getPendingTransactions();
      assert.equal(pending.length, 0, "Pending transactions should be empty initially");
    });
  });

  describe("Role Management and Wallet Count", function () {
    it("should return correct wallet count for owner role", async function () {
      const OWNER_ROLE = "0x542ebd056dcb61d328d2ae572dc534147e13901e8b9f46a60701f85bee10689c";
      const roleInfo = await bareBlox.getRole(OWNER_ROLE);
      
      assert.equal(roleInfo.walletCount.toString(), "1", "Owner role should have 1 wallet");
      assert.equal(roleInfo.maxWallets.toString(), "1", "Owner role max wallets should be 1");
      assert.isTrue(roleInfo.isProtected, "Owner role should be protected");
      assert.equal(roleInfo.roleName, "OWNER_ROLE", "Role name should be OWNER_ROLE");
    });

    it("should return correct wallet count for broadcaster role", async function () {
      const BROADCASTER_ROLE = "0xc15f6c501c46d6a978ce193e529ccf232fd6296d7ae1d8e05d1397d0c763acd2";
      const roleInfo = await bareBlox.getRole(BROADCASTER_ROLE);
      
      assert.equal(roleInfo.walletCount.toString(), "1", "Broadcaster role should have 1 wallet");
      assert.equal(roleInfo.maxWallets.toString(), "1", "Broadcaster role max wallets should be 1");
      assert.isTrue(roleInfo.isProtected, "Broadcaster role should be protected");
      assert.equal(roleInfo.roleName, "BROADCASTER_ROLE", "Role name should be BROADCASTER_ROLE");
    });

    it("should return correct wallet count for recovery role", async function () {
      const RECOVERY_ROLE = "0x92a45ac1c17729837eadae4b2a6e244b3e684811c8ffef29684ccf097245cb93";
      const roleInfo = await bareBlox.getRole(RECOVERY_ROLE);
      
      assert.equal(roleInfo.walletCount.toString(), "1", "Recovery role should have 1 wallet");
      assert.equal(roleInfo.maxWallets.toString(), "1", "Recovery role max wallets should be 1");
      assert.isTrue(roleInfo.isProtected, "Recovery role should be protected");
      assert.equal(roleInfo.roleName, "RECOVERY_ROLE", "Role name should be RECOVERY_ROLE");
    });

    it("should verify wallet count matches actual wallet assignments", async function () {
      const OWNER_ROLE = "0x542ebd056dcb61d328d2ae572dc534147e13901e8b9f46a60701f85bee10689c";
      const BROADCASTER_ROLE = "0xc15f6c501c46d6a978ce193e529ccf232fd6296d7ae1d8e05d1397d0c763acd2";
      const RECOVERY_ROLE = "0x92a45ac1c17729837eadae4b2a6e244b3e684811c8ffef29684ccf097245cb93";
      
      // Check that wallet count matches the actual number of wallets assigned
      const ownerRoleInfo = await bareBlox.getRole(OWNER_ROLE);
      const broadcasterRoleInfo = await bareBlox.getRole(BROADCASTER_ROLE);
      const recoveryRoleInfo = await bareBlox.getRole(RECOVERY_ROLE);
      
      // Verify that walletCount is 1 for all base roles
      assert.equal(ownerRoleInfo.walletCount.toString(), "1", "Owner role wallet count should be 1");
      assert.equal(broadcasterRoleInfo.walletCount.toString(), "1", "Broadcaster role wallet count should be 1");
      assert.equal(recoveryRoleInfo.walletCount.toString(), "1", "Recovery role wallet count should be 1");
      
      // Verify that the wallets are correctly assigned
      assert.isTrue(await bareBlox.hasRole(OWNER_ROLE, owner), "Owner should have owner role");
      assert.isTrue(await bareBlox.hasRole(BROADCASTER_ROLE, broadcaster), "Broadcaster should have broadcaster role");
      assert.isTrue(await bareBlox.hasRole(RECOVERY_ROLE, recovery), "Recovery should have recovery role");
    });

    it("should return complete role information including permissions", async function () {
      const OWNER_ROLE = "0x542ebd056dcb61d328d2ae572dc534147e13901e8b9f46a60701f85bee10689c";
      
      // Test the enhanced getRoleInfo method (if available through DynamicRBAC)
      // For GuardianBare, we'll test the basic getRole method
      const roleInfo = await bareBlox.getRole(OWNER_ROLE);
      
      // Verify all basic role information
      assert.equal(roleInfo.walletCount.toString(), "1", "Owner role should have 1 wallet");
      assert.equal(roleInfo.maxWallets.toString(), "1", "Owner role max wallets should be 1");
      assert.isTrue(roleInfo.isProtected, "Owner role should be protected");
      assert.equal(roleInfo.roleName, "OWNER_ROLE", "Role name should be OWNER_ROLE");
      
      // Verify that the role hash matches
      assert.equal(roleInfo.roleHashReturn, OWNER_ROLE, "Role hash should match");
    });
  });

  describe("Interface Support", function () {
    it("should support ERC165 interface", async function () {
      const ERC165_INTERFACE_ID = "0x01ffc9a7";
      const supportsERC165 = await bareBlox.supportsInterface(ERC165_INTERFACE_ID);
      assert.isTrue(supportsERC165, "Should support ERC165 interface");
    });
  });
});

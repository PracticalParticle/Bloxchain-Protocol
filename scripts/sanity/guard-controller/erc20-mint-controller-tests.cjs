/**
 * ERC20 Mint via GuardController Sanity Tests
 * Demonstrates operating BasicERC20.mint on an external contract through AccountBlox:
 * MINT_REQUESTOR (requester) → MINT_APPROVER (sign meta approve) → BROADCASTER (execute).
 * Verifies TxStatus COMPLETED and token balance increase on AccountBlox.
 */

const path = require('path');
const fs = require('fs');
const BaseGuardControllerTest = require('./base-test.cjs');

// ERC20 mint(address,uint256) selector
const ERC20_MINT_SELECTOR = '0x40c10f19';
const ERC20_MINT_SIGNATURE = 'mint(address,uint256)';
const ERC20_MINT_OPERATION_TYPE = 'ERC20_MINT'; // will be keccak256 in test

class ERC20MintControllerTests extends BaseGuardControllerTest {
    constructor() {
        super('ERC20 Mint via GuardController Tests');
        this.basicErc20Address = null;
        this.mintRequestorWallet = null;
        this.mintApproverWallet = null;
        this.erc20MintOperationTypeHash = null;
    }

    getBasicErc20Address() {
        if (this.basicErc20Address) return this.basicErc20Address;
        const envAddr = process.env.BASICERC20_ADDRESS;
        if (envAddr) {
            this.basicErc20Address = envAddr;
            return this.basicErc20Address;
        }
        const addressesPath = path.join(__dirname, '../../../deployed-addresses.json');
        if (!fs.existsSync(addressesPath)) {
            throw new Error('BasicERC20 address not set (BASICERC20_ADDRESS) and deployed-addresses.json not found');
        }
        const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
        // Use development only for remote dev; keeps AccountBlox and BasicERC20 in sync (same deployed-addresses.json key)
        const network = process.env.NETWORK_NAME || process.env.GUARDIAN_NETWORK || 'development';
        const info = addresses[network]?.BasicERC20;
        if (!info?.address) {
            throw new Error(`BasicERC20 not in deployed-addresses.json for network "${network}"`);
        }
        this.basicErc20Address = info.address;
        return this.basicErc20Address;
    }

    async executeTests() {
        console.log('\n🔄 ERC20 MINT VIA CONTROLLER WORKFLOW');
        console.log('==================================================');
        console.log('   1. Create roles: MINT_REQUESTOR, MINT_APPROVER');
        console.log('   2. Register mint(address,uint256) schema with full workflow permissions');
        console.log('   3. Whitelist BasicERC20 for mint selector');
        console.log('   4. Add function to roles: MINT_REQUESTOR=request, MINT_APPROVER=meta approve+cancel, BROADCASTER=execute');
        console.log('   5. Request (requester=MINT_REQUESTOR) → Sign (MINT_APPROVER) → Execute (BROADCASTER)');
        console.log('   6. Verify tokens minted and passed to destination (totalSupply + balance increase)');

        // Ensure AccountBlox and BasicERC20 are in sync (BasicERC20.minter must be this AccountBlox)
        const tokenAddress = this.getBasicErc20Address();
        const network = process.env.NETWORK_NAME || process.env.GUARDIAN_NETWORK || 'development';
        const addressesPath = path.join(__dirname, '../../../deployed-addresses.json');
        if (fs.existsSync(addressesPath)) {
            const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
            const basicInfo = addresses[network]?.BasicERC20;
            const expectedMinter = basicInfo?.minter;
            if (expectedMinter && this.contractAddress) {
                const minterNorm = expectedMinter.toLowerCase();
                const accountNorm = this.contractAddress.toLowerCase();
                if (minterNorm !== accountNorm) {
                    throw new Error(
                        `AccountBlox and BasicERC20 are out of sync for network "${network}". ` +
                        `AccountBlox is ${this.contractAddress} but BasicERC20 minter is ${expectedMinter}. ` +
                        `Use deployed-addresses.json["${network}"] for both (re-run migrations to that network).`
                    );
                }
                console.log(`  ✅ AccountBlox and BasicERC20 in sync (minter = AccountBlox for network ${network})`);
            }
        }

        this.erc20MintOperationTypeHash = this.web3.utils.keccak256(ERC20_MINT_OPERATION_TYPE);
        this.mintRequestorWallet = this.wallets.wallet3;
        this.mintApproverWallet = this.wallets.wallet4;

        await this.testStep1CreateRoles();
        await this.testStep2RegisterMintFunction();
        await this.testStep3WhitelistBasicErc20();
        await this.testStep4AddFunctionToRoles();
        await this.testStep5MintFlow();
        await this.testStep6Verify();
    }

    async testStep1CreateRoles() {
        await this.startTest('Create MINT_REQUESTOR and MINT_APPROVER roles');
        try {
            // BEFORE: verify roles do not exist (or only verify after we ensure state)
            const requestorExistsBefore = await this.roleExists(this.getRoleHash('MINT_REQUESTOR'));
            const approverExistsBefore = await this.roleExists(this.getRoleHash('MINT_APPROVER'));
            if (requestorExistsBefore && approverExistsBefore) {
                console.log('  ℹ️  Both roles already exist; verifying state and skipping create');
                await this.verifyStep1RolesAfter();
                await this.passTest('Create MINT_REQUESTOR and MINT_APPROVER roles', 'Roles already present and verified');
                return;
            }

            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');

            const createRequestor = this.encodeRoleConfigAction(this.RoleConfigActionType.CREATE_ROLE, {
                roleName: 'MINT_REQUESTOR',
                maxWallets: 10,
                functionPermissions: []
            });
            const createApprover = this.encodeRoleConfigAction(this.RoleConfigActionType.CREATE_ROLE, {
                roleName: 'MINT_APPROVER',
                maxWallets: 10,
                functionPermissions: []
            });
            const addWalletRequestor = this.encodeRoleConfigAction(this.RoleConfigActionType.ADD_WALLET, {
                roleHash: this.getRoleHash('MINT_REQUESTOR'),
                wallet: this.mintRequestorWallet.address
            });
            const addWalletApprover = this.encodeRoleConfigAction(this.RoleConfigActionType.ADD_WALLET, {
                roleHash: this.getRoleHash('MINT_APPROVER'),
                wallet: this.mintApproverWallet.address
            });

            const actions = [createRequestor, createApprover, addWalletRequestor, addWalletApprover];
            const receipt = await this.executeRoleConfigBatch(actions, ownerPrivateKey, broadcasterWallet);

            const ok = receipt.status === true || receipt.status === 1;
            this.assertTest(ok, `Create roles tx succeeded (status: ${receipt.status})`);

            // AFTER: verify both roles exist
            await this.verifyStep1RolesAfter();
            await this.passTest('Create MINT_REQUESTOR and MINT_APPROVER roles', 'Roles and wallets assigned');
        } catch (error) {
            if (error.message.includes('ResourceAlreadyExists') || error.message.includes('ItemAlreadyExists')) {
                console.log('  ℹ️  Roles/wallets already exist, verifying state...');
                await this.verifyStep1RolesAfter();
                await this.passTest('Create roles (idempotent)', 'Roles already present');
            } else {
                await this.failTest('Create MINT_REQUESTOR and MINT_APPROVER roles', error);
                throw error;
            }
        }
    }

    async verifyStep1RolesAfter() {
        const requestorExists = await this.roleExists(this.getRoleHash('MINT_REQUESTOR'));
        const approverExists = await this.roleExists(this.getRoleHash('MINT_APPROVER'));
        this.assertTest(requestorExists, 'MINT_REQUESTOR role exists after step 1');
        this.assertTest(approverExists, 'MINT_APPROVER role exists after step 1');
    }

    async testStep2RegisterMintFunction() {
        await this.startTest('Register ERC20 mint function schema');
        try {
            const FULL_WORKFLOW_ACTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
            const expectedBitmap = this.createBitmapFromActions(FULL_WORKFLOW_ACTIONS);

            // BEFORE: verify mint schema does not exist, or exists with correct full workflow
            const schemaBefore = await this.getFunctionSchemaOrNull(ERC20_MINT_SELECTOR);
            if (schemaBefore != null) {
                await this.verifyFunctionSchema(ERC20_MINT_SELECTOR, {
                    functionSignature: ERC20_MINT_SIGNATURE,
                    operationName: ERC20_MINT_OPERATION_TYPE,
                    supportedActionsBitmap: expectedBitmap
                });
                console.log('  ℹ️  mint schema already registered with correct full workflow; skipping register');
                await this.verifyStep2SchemaAfter(expectedBitmap);
                await this.passTest('Register ERC20 mint function schema', 'Already registered and verified');
                return;
            }

            // Register mint schema
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            const receipt = await this.registerFunction(
                ERC20_MINT_SELECTOR,
                ERC20_MINT_SIGNATURE,
                ERC20_MINT_OPERATION_TYPE,
                FULL_WORKFLOW_ACTIONS,
                ownerPrivateKey,
                broadcasterWallet
            );
            const ok = receipt.status === true || receipt.status === 1;
            this.assertTest(ok, `Register function tx succeeded (status: ${receipt.status})`);

            // AFTER: verify schema exists with exact signature, operationName, and full workflow bitmap
            await this.verifyStep2SchemaAfter(expectedBitmap);
            await this.passTest('Register ERC20 mint function schema', ERC20_MINT_SIGNATURE);
        } catch (error) {
            await this.failTest('Register ERC20 mint function schema', error);
            throw error;
        }
    }

    async verifyStep2SchemaAfter(expectedBitmap) {
        await this.verifyFunctionSchema(ERC20_MINT_SELECTOR, {
            functionSignature: ERC20_MINT_SIGNATURE,
            operationName: ERC20_MINT_OPERATION_TYPE,
            supportedActionsBitmap: expectedBitmap
        });
        console.log(`     Schema: ${ERC20_MINT_SIGNATURE}, operation: ${ERC20_MINT_OPERATION_TYPE}, bitmap: ${expectedBitmap}`);
    }

    async testStep3WhitelistBasicErc20() {
        await this.startTest('Whitelist BasicERC20 for mint selector');
        try {
            const tokenAddress = this.getBasicErc20Address();

            // BEFORE: target must not be whitelisted (or we verify after and skip)
            const whitelistedBefore = await this.isTargetWhitelistedForSelector(ERC20_MINT_SELECTOR, tokenAddress);
            if (whitelistedBefore) {
                console.log('  ℹ️  BasicERC20 already whitelisted for mint');
                await this.verifyStep3WhitelistAfter(tokenAddress);
                await this.passTest('Whitelist BasicERC20', 'Already whitelisted');
                return;
            }

            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            await this.addTargetToWhitelist(ERC20_MINT_SELECTOR, tokenAddress, ownerPrivateKey, broadcasterWallet);

            // AFTER: target must be whitelisted
            await this.verifyStep3WhitelistAfter(tokenAddress);
            await this.passTest('Whitelist BasicERC20', tokenAddress);
        } catch (error) {
            if (error.message.includes('ItemAlreadyExists') || error.message.includes('already whitelisted')) {
                console.log('  ℹ️  Target already whitelisted, verifying...');
                await this.verifyStep3WhitelistAfter(this.getBasicErc20Address());
                await this.passTest('Whitelist BasicERC20', 'Already whitelisted');
            } else {
                await this.failTest('Whitelist BasicERC20', error);
                throw error;
            }
        }
    }

    async verifyStep3WhitelistAfter(tokenAddress) {
        const whitelisted = await this.isTargetWhitelistedForSelector(ERC20_MINT_SELECTOR, tokenAddress);
        this.assertTest(whitelisted, `BasicERC20 ${tokenAddress} is in whitelist for mint selector`);
    }

    async testStep4AddFunctionToRoles() {
        await this.startTest('Add function permissions to MINT_REQUESTOR, MINT_APPROVER, BROADCASTER');
        try {
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');

            // Align with sanity-sdk (3-step flow):
            // (1) MINT_REQUESTOR requests via executeWithTimeLock
            // (2) MINT_APPROVER signs meta approve/cancel
            // (3) BROADCASTER executes approve/cancel meta-tx (and needs execution-selector permissions too)
            const requestorRoleHash = this.getRoleHash('MINT_REQUESTOR');
            const approverRoleHash = this.getRoleHash('MINT_APPROVER');
            const broadcasterRoleHash = this.getRoleHash('BROADCASTER_ROLE');

            const requestorHasMintRequest = await this.roleHasPermissionForSelector(
                requestorRoleHash,
                ERC20_MINT_SELECTOR,
                this.TxAction.EXECUTE_TIME_DELAY_REQUEST
            );
            const requestorHasControllerRequest = await this.roleHasPermissionForSelector(
                requestorRoleHash,
                this.EXECUTE_WITH_TIMELOCK_SELECTOR,
                this.TxAction.EXECUTE_TIME_DELAY_REQUEST
            );
            const approverHasMintMetaApprove = await this.roleHasPermissionForSelector(
                approverRoleHash,
                ERC20_MINT_SELECTOR,
                this.TxAction.SIGN_META_APPROVE
            );
            const approverHasMintMetaCancel = await this.roleHasPermissionForSelector(
                approverRoleHash,
                ERC20_MINT_SELECTOR,
                this.TxAction.SIGN_META_CANCEL
            );
            const approverHasApproveMetaTx = await this.roleHasPermissionForSelector(
                approverRoleHash,
                this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
                this.TxAction.SIGN_META_APPROVE
            );
            const approverHasCancelMetaTx = await this.roleHasPermissionForSelector(
                approverRoleHash,
                this.CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
                this.TxAction.SIGN_META_CANCEL
            );
            const broadcasterHasMintExecApprove = await this.roleHasPermissionForSelector(
                broadcasterRoleHash,
                ERC20_MINT_SELECTOR,
                this.TxAction.EXECUTE_META_APPROVE
            );
            const broadcasterHasMintExecCancel = await this.roleHasPermissionForSelector(
                broadcasterRoleHash,
                ERC20_MINT_SELECTOR,
                this.TxAction.EXECUTE_META_CANCEL
            );
            const broadcasterHasApproveHandler = await this.roleHasPermissionForSelector(
                broadcasterRoleHash,
                this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
                this.TxAction.EXECUTE_META_APPROVE
            );
            const broadcasterHasCancelHandler = await this.roleHasPermissionForSelector(
                broadcasterRoleHash,
                this.CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
                this.TxAction.EXECUTE_META_CANCEL
            );

            if (
                requestorHasMintRequest &&
                requestorHasControllerRequest &&
                approverHasMintMetaApprove &&
                approverHasMintMetaCancel &&
                approverHasApproveMetaTx &&
                approverHasCancelMetaTx &&
                broadcasterHasMintExecApprove &&
                broadcasterHasMintExecCancel &&
                broadcasterHasApproveHandler &&
                broadcasterHasCancelHandler
            ) {
                console.log('  ℹ️  Mint role permissions already correctly configured; skipping cleanup batch');
                await this.verifyStep4RolePermissions();
                await this.passTest(
                    'Add function to roles',
                    'Permissions already correctly configured for MINT_REQUESTOR, MINT_APPROVER, BROADCASTER'
                );
                return;
            }

            const ensureExactPermission = async (roleHash, functionSelector, requiredActions, label) => {
                const perms = await this.callContractMethod(this.contract.methods.getActiveRolePermissions(roleHash));
                const normSel = functionSelector.toLowerCase();
                const found = (perms || []).find((p) => {
                    const sel = (p.functionSelector ?? p[0]);
                    return sel && String(sel).toLowerCase() === normSel;
                });
                const requiredBitmap = this.createBitmapFromActions(requiredActions);
                const currentBitmapRaw = found ? (found.grantedActionsBitmap ?? found[1]) : null;
                const currentBitmap = currentBitmapRaw != null ? Number(currentBitmapRaw) : null;

                if (currentBitmap === requiredBitmap) {
                    console.log(`  ✅ ${label} already correct (bitmap=${requiredBitmap})`);
                    return;
                }

                if (currentBitmap != null) {
                    console.log(`  🔧 ${label} bitmap mismatch: current=${currentBitmap}, required=${requiredBitmap}. Replacing...`);
                    await this.removeFunctionFromRole(roleHash, functionSelector, ownerPrivateKey, broadcasterWallet);
                } else {
                    console.log(`  🔧 ${label} missing. Adding...`);
                }

                await this.addFunctionToRole(roleHash, functionSelector, requiredActions, ownerPrivateKey, broadcasterWallet);
                await new Promise(r => setTimeout(r, 500));
            };

            const requestorActions = [this.TxAction.EXECUTE_TIME_DELAY_REQUEST];
            const approverMintActions = [this.TxAction.SIGN_META_APPROVE, this.TxAction.SIGN_META_CANCEL];
            const broadcasterApproveCancelActions = [this.TxAction.EXECUTE_META_APPROVE, this.TxAction.EXECUTE_META_CANCEL];

            await ensureExactPermission(requestorRoleHash, ERC20_MINT_SELECTOR, requestorActions, 'MINT_REQUESTOR mint request');
            await ensureExactPermission(requestorRoleHash, this.EXECUTE_WITH_TIMELOCK_SELECTOR, requestorActions, 'MINT_REQUESTOR executeWithTimeLock');

            await ensureExactPermission(approverRoleHash, ERC20_MINT_SELECTOR, approverMintActions, 'MINT_APPROVER mint sign approve/cancel');
            await ensureExactPermission(approverRoleHash, this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR, [this.TxAction.SIGN_META_APPROVE], 'MINT_APPROVER approveTimeLockExecutionWithMetaTx sign');
            await ensureExactPermission(approverRoleHash, this.CANCEL_TIMELOCK_EXECUTION_META_SELECTOR, [this.TxAction.SIGN_META_CANCEL], 'MINT_APPROVER cancelTimeLockExecutionWithMetaTx sign');

            // Broadcaster needs BOTH handler permissions (approve/cancel meta) AND execution-selector permissions (mint)
            await ensureExactPermission(broadcasterRoleHash, ERC20_MINT_SELECTOR, broadcasterApproveCancelActions, 'BROADCASTER_ROLE mint execute approve/cancel');
            await ensureExactPermission(broadcasterRoleHash, this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR, broadcasterApproveCancelActions, 'BROADCASTER_ROLE approveTimeLockExecutionWithMetaTx execute');
            await ensureExactPermission(broadcasterRoleHash, this.CANCEL_TIMELOCK_EXECUTION_META_SELECTOR, broadcasterApproveCancelActions, 'BROADCASTER_ROLE cancelTimeLockExecutionWithMetaTx execute');

            // AFTER: verify each role has the correct action permission for mint selector
            await this.verifyStep4RolePermissions();
            await this.passTest(
                'Add function to roles',
                '3-step: requestor requests, approver signs approve/cancel, broadcaster executes approve/cancel'
            );
        } catch (error) {
            await this.failTest('Add function permissions to roles', error);
            throw error;
        }
    }

    async verifyStep4RolePermissions() {
        const requestorHasRequest = await this.roleHasPermissionForSelector(
            this.getRoleHash('MINT_REQUESTOR'),
            ERC20_MINT_SELECTOR,
            this.TxAction.EXECUTE_TIME_DELAY_REQUEST
        );
        this.assertTest(requestorHasRequest, 'MINT_REQUESTOR has EXECUTE_TIME_DELAY_REQUEST for mint');

        const requestorHasControllerRequest = await this.roleHasPermissionForSelector(
            this.getRoleHash('MINT_REQUESTOR'),
            this.EXECUTE_WITH_TIMELOCK_SELECTOR,
            this.TxAction.EXECUTE_TIME_DELAY_REQUEST
        );
        this.assertTest(requestorHasControllerRequest, 'MINT_REQUESTOR has controller permission for executeWithTimeLock (mint)');

        const approverRoleHash = this.getRoleHash('MINT_APPROVER');
        const approverMintMetaApprove = await this.roleHasPermissionForSelector(
            approverRoleHash,
            ERC20_MINT_SELECTOR,
            this.TxAction.SIGN_META_APPROVE
        );
        const approverMintMetaCancel = await this.roleHasPermissionForSelector(
            approverRoleHash,
            ERC20_MINT_SELECTOR,
            this.TxAction.SIGN_META_CANCEL
        );

        console.log('     MINT_APPROVER mint permissions:');
        console.log(`       SIGN_META_APPROVE            (mint): ${approverMintMetaApprove}`);
        console.log(`       SIGN_META_CANCEL             (mint): ${approverMintMetaCancel}`);

        const approverApproveMetaTx = await this.roleHasPermissionForSelector(
            approverRoleHash,
            this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            this.TxAction.SIGN_META_APPROVE
        );
        const approverCancelMetaTx = await this.roleHasPermissionForSelector(
            approverRoleHash,
            this.CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            this.TxAction.SIGN_META_CANCEL
        );
        console.log('     MINT_APPROVER controller permissions:');
        console.log(`       approveTimeLockExecutionWithMetaTx (SIGN_META_APPROVE): ${approverApproveMetaTx}`);
        console.log(`       cancelTimeLockExecutionWithMetaTx (SIGN_META_CANCEL): ${approverCancelMetaTx}`);

        this.assertTest(approverMintMetaApprove, 'MINT_APPROVER has SIGN_META_APPROVE for mint');
        this.assertTest(approverMintMetaCancel, 'MINT_APPROVER has SIGN_META_CANCEL for mint');
        this.assertTest(approverApproveMetaTx, 'MINT_APPROVER has controller permission for approveTimeLockExecutionWithMetaTx');
        this.assertTest(approverCancelMetaTx, 'MINT_APPROVER has controller permission for cancelTimeLockExecutionWithMetaTx');

        const broadcasterRoleHash = this.getRoleHash('BROADCASTER_ROLE');
        const broadcasterHasExecApprove = await this.roleHasPermissionForSelector(
            broadcasterRoleHash,
            ERC20_MINT_SELECTOR,
            this.TxAction.EXECUTE_META_APPROVE
        );
        const broadcasterHasExecCancel = await this.roleHasPermissionForSelector(
            broadcasterRoleHash,
            ERC20_MINT_SELECTOR,
            this.TxAction.EXECUTE_META_CANCEL
        );
        const broadcasterHasApproveHandler = await this.roleHasPermissionForSelector(
            broadcasterRoleHash,
            this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            this.TxAction.EXECUTE_META_APPROVE
        );
        const broadcasterHasCancelHandler = await this.roleHasPermissionForSelector(
            broadcasterRoleHash,
            this.CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            this.TxAction.EXECUTE_META_CANCEL
        );
        this.assertTest(broadcasterHasExecApprove, 'BROADCASTER_ROLE has EXECUTE_META_APPROVE for mint');
        this.assertTest(broadcasterHasExecCancel, 'BROADCASTER_ROLE has EXECUTE_META_CANCEL for mint');
        this.assertTest(broadcasterHasApproveHandler, 'BROADCASTER_ROLE has EXECUTE_META_APPROVE for approveTimeLockExecutionWithMetaTx');
        this.assertTest(broadcasterHasCancelHandler, 'BROADCASTER_ROLE has EXECUTE_META_CANCEL for cancelTimeLockExecutionWithMetaTx');
        console.log('     Role permissions verified for mint selector');
    }

    async testStep5MintFlow() {
        await this.startTest('Mint 100 tokens to AccountBlox via 3-step flow (timelock request + meta approve)');
        try {
            console.log('  [DEBUG] step5 BEFORE createExternalExecutionMetaTx');
            const tokenAddress = this.getBasicErc20Address();
            const mintAmount = this.web3.utils.toBN('100000000000000000000'); // 100e18
            // BEFORE: record balance and totalSupply so step 6 can verify mint actually occurred
            // IMPORTANT: use raw eth_call + manual decode to avoid Contract._decodeMethodReturn
            // and any ABI enum/\"u\" issues inside web3's Contract abstraction.
            const balanceOfCallData = this.web3.eth.abi.encodeFunctionCall(
                {
                    name: 'balanceOf',
                    type: 'function',
                    inputs: [{ name: 'account', type: 'address' }]
                },
                [this.contractAddress]
            );
            const balanceBeforeHex = await this.web3.eth.call({
                to: tokenAddress,
                data: balanceOfCallData
            });
            const balanceBeforeDecoded = this.web3.eth.abi.decodeParameter('uint256', balanceBeforeHex);
            this._balanceBeforeMint = this.web3.utils.toBN(balanceBeforeDecoded);

            const totalSupplyCallData = this.web3.eth.abi.encodeFunctionCall(
                { name: 'totalSupply', type: 'function', inputs: [] },
                []
            );
            const totalSupplyBeforeHex = await this.web3.eth.call({
                to: tokenAddress,
                data: totalSupplyCallData
            });
            const totalSupplyBeforeDecoded = this.web3.eth.abi.decodeParameter('uint256', totalSupplyBeforeHex);
            this._totalSupplyBeforeMint = this.web3.utils.toBN(totalSupplyBeforeDecoded);

            const executionParams = this.web3.eth.abi.encodeParameters(
                ['address', 'uint256'],
                [this.contractAddress, mintAmount.toString()]
            );

            // Step 1: time-lock request (MINT_REQUESTOR calls executeWithTimeLock)
            const requestResult = await this.sendTransaction(
                this.contract.methods.executeWithTimeLock(
                    tokenAddress,
                    '0',
                    ERC20_MINT_SELECTOR,
                    executionParams,
                    200000,
                    this.erc20MintOperationTypeHash
                ),
                this.mintRequestorWallet
            );
            const requestReceipt = requestResult && requestResult.receipt ? requestResult.receipt : requestResult;
            let requestTxId = this.extractTxIdFromReceipt(requestReceipt);
            this.assertTest(requestReceipt && (requestReceipt.status === true || requestReceipt.status === 1 || requestReceipt.status === '0x1'), 'executeWithTimeLock tx succeeded');
            if (requestTxId == null) {
                // Some RPCs/providers omit logs for reverted/typed tx or web3 returns an empty logs array.
                // Fallback: read pending transaction IDs then resolve them via getTransaction(txId).
                try {
                    const pendingIds = await this.callContractMethod(this.contract.methods.getPendingTransactions());
                    const requesterNorm = this.mintRequestorWallet.address.toLowerCase();
                    const targetNorm = tokenAddress.toLowerCase();
                    const opNorm = String(this.erc20MintOperationTypeHash).toLowerCase();
                    const selNorm = ERC20_MINT_SELECTOR.toLowerCase();
                    for (const id of (pendingIds || [])) {
                        const t = await this.callContractMethod(this.contract.methods.getTransaction(id));
                        const params = t.params ?? t[3];
                        const requester = params?.requester ?? params?.[0];
                        const target = params?.target ?? params?.[1];
                        const op = params?.operationType ?? params?.[4];
                        const sel = params?.executionSelector ?? params?.[5];
                        const isMatch =
                            requester && String(requester).toLowerCase() === requesterNorm &&
                            target && String(target).toLowerCase() === targetNorm &&
                            op && String(op).toLowerCase() === opNorm &&
                            sel && String(sel).toLowerCase() === selNorm;
                        if (isMatch) {
                            requestTxId = id;
                        }
                    }
                    if (requestTxId != null) {
                        console.log(`  ℹ️  Fallback txId resolved from pending list: ${requestTxId}`);
                    }
                } catch (e) {
                    console.warn('  [WARN] Could not derive txId from getPendingTransactions fallback:', e.message || e);
                }
            }
            this.assertTest(requestTxId != null, 'executeWithTimeLock produced a txId (receipt log or pending-tx fallback)');

            // Step 2: meta approve (MINT_APPROVER signs approve; BROADCASTER executes approveTimeLockExecutionWithMetaTx)
            const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
            const maxGasPrice = 0;
            const metaParams = await this._callCreateMetaTxParamsRaw(
                this.contractAddress,
                this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
                this.TxAction.SIGN_META_APPROVE,
                deadline,
                maxGasPrice,
                this.mintApproverWallet.address
            );
            const unsignedApproveMetaTx = await this._callGenerateUnsignedMetaTransactionForExistingRaw(
                requestTxId,
                metaParams
            );
            console.log(`  [DEBUG] step5 approve meta unsigned: message=${unsignedApproveMetaTx.message != null ? 'set' : 'MISSING'}`);

            const signedApproveMetaTx = await this.eip712Signer.signMetaTransaction(
                unsignedApproveMetaTx,
                this.mintApproverWallet.privateKey,
                this.contract
            );
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            const fullApproveMetaTx = { ...unsignedApproveMetaTx, message: signedApproveMetaTx.message, signature: signedApproveMetaTx.signature };

            const approveResult = await this.sendTransaction(
                this.contract.methods.approveTimeLockExecutionWithMetaTx(fullApproveMetaTx),
                broadcasterWallet
            );
            this._mintReceipt = approveResult && approveResult.receipt ? approveResult.receipt : approveResult;
            this._mintTxId = requestTxId;
            const ok = this._mintReceipt && (this._mintReceipt.status === true || this._mintReceipt.status === 1 || this._mintReceipt.status === '0x1');
            this.assertTest(ok, `approveTimeLockExecutionWithMetaTx tx succeeded (txId: ${this._mintTxId})`);
            if (this._mintTxId == null) {
                console.log('  ⚠️  TxId could not be extracted from receipt (logs may be missing or event shape differs).');
                console.log('  📋 Mint is NOT confirmed until step 6 verifies balance and totalSupply increase.');
            }
            await this.passTest('Mint flow executed', `Tx accepted (txId: ${this._mintTxId ?? 'n/a'}; mint verification in step 6)`);
        } catch (error) {
            await this.failTest('Mint 100 tokens to AccountBlox', error);
            throw error;
        }
    }

    async testStep6Verify() {
        await this.startTest('Verify tokens minted and passed to destination (balance + totalSupply)');
        try {
            let txId = this._mintTxId;
            let receipt = this._mintReceipt;
            // If receipt was from decode-error path or chain was restarted, logs can be missing. Re-fetch once by tx hash.
            if (receipt && receipt.transactionHash && (!receipt.logs || receipt.logs.length === 0)) {
                await new Promise(r => setTimeout(r, 1500));
                try {
                    const refetched = await this.web3.eth.getTransactionReceipt(receipt.transactionHash);
                    if (refetched && refetched.logs && refetched.logs.length > 0) {
                        receipt = refetched;
                        this._mintReceipt = receipt;
                    }
                } catch (e) {
                    // ignore
                }
            }
            const eventSignature = this.web3.utils.keccak256('TransactionEvent(uint256,bytes4,uint8,address,address,bytes32)');
            let statusFromLog = null;
            if (receipt && receipt.logs) {
                for (const log of receipt.logs) {
                    if (log.topics && log.topics[0] === eventSignature) {
                        const decoded = this.web3.eth.abi.decodeLog(
                            [
                                { type: 'uint256', name: 'txId', indexed: true },
                                { type: 'bytes4', name: 'functionHash', indexed: true },
                                { type: 'uint8', name: 'status' },
                                { type: 'address', name: 'requester', indexed: true },
                                { type: 'address', name: 'target' },
                                { type: 'bytes32', name: 'operationType' }
                            ],
                            log.data,
                            log.topics.slice(1)
                        );
                        const decodedTxId = decoded.txId;
                        const decodedStatus = typeof decoded.status === 'object' && decoded.status != null && decoded.status.toNumber != null
                            ? decoded.status.toNumber()
                            : (decoded.status || 0);

                        if (!txId && decodedTxId) {
                            txId = decodedTxId;
                            this._mintTxId = decodedTxId;
                        }

                        // Keep the last TransactionEvent for this txId (final status: COMPLETED/FAILED, not PENDING/EXECUTING)
                        if (txId && decodedTxId && decodedTxId.toString() === txId.toString()) {
                            statusFromLog = decodedStatus;
                        }
                    }
                }
            }
            if (statusFromLog !== null && statusFromLog !== undefined) {
                const statusNum = typeof statusFromLog === 'object' && statusFromLog != null && typeof statusFromLog.toNumber === 'function'
                    ? statusFromLog.toNumber()
                    : Number(statusFromLog);
                if (statusNum === this.TxStatus.FAILED) {
                    this.assertTest(false, `TxStatus COMPLETED (got FAILED). Mint execution reverted on-chain. If the chain was restarted, re-run the full test suite.`);
                } else {
                    this.assertTest(statusNum === this.TxStatus.COMPLETED, `TxStatus COMPLETED (got ${statusNum})`);
                }
            } else {
                console.warn('  [WARN] No TransactionEvent found for mint tx; relying on balance + totalSupply for mint verification');
            }

            const tokenAddress = this.getBasicErc20Address();
            const expectedIncrease = this.web3.utils.toBN('100000000000000000000');
            const balanceBefore = this._balanceBeforeMint != null ? this._balanceBeforeMint : this.web3.utils.toBN(0);
            const totalSupplyBefore = this._totalSupplyBeforeMint != null ? this._totalSupplyBeforeMint : this.web3.utils.toBN(0);

            // --- Balance: tokens passed to destination (AccountBlox) ---
            const balanceOfCallData = this.web3.eth.abi.encodeFunctionCall(
                {
                    name: 'balanceOf',
                    type: 'function',
                    inputs: [{ name: 'account', type: 'address' }]
                },
                [this.contractAddress]
            );
            let balanceAfterHex = await this.web3.eth.call({
                to: tokenAddress,
                data: balanceOfCallData
            });
            let balanceAfterDecoded = this.web3.eth.abi.decodeParameter('uint256', balanceAfterHex);
            let balanceAfter = this.web3.utils.toBN(balanceAfterDecoded);
            let actualBalanceIncrease = balanceAfter.sub(balanceBefore);
            if (actualBalanceIncrease.lt(expectedIncrease)) {
                await new Promise(r => setTimeout(r, 2000));
                balanceAfterHex = await this.web3.eth.call({
                    to: tokenAddress,
                    data: balanceOfCallData
                });
                balanceAfterDecoded = this.web3.eth.abi.decodeParameter('uint256', balanceAfterHex);
                balanceAfter = this.web3.utils.toBN(balanceAfterDecoded);
                actualBalanceIncrease = balanceAfter.sub(balanceBefore);
            }
            this.assertTest(
                actualBalanceIncrease.eq(expectedIncrease),
                `Tokens passed to destination: AccountBlox balance must increase by 100e18 (got +${this.web3.utils.fromWei(actualBalanceIncrease.toString(), 'ether')} BASIC)`
            );
            console.log(`  ✅ Verified: tokens passed to destination (AccountBlox balance +100e18)`);

            this.assertTest(balanceAfter.gte(expectedIncrease), `AccountBlox token balance >= 100 (got ${this.web3.utils.fromWei(balanceAfter.toString(), 'ether')})`);

            // --- TotalSupply: tokens were actually minted ---
            const totalSupplyCallData = this.web3.eth.abi.encodeFunctionCall(
                { name: 'totalSupply', type: 'function', inputs: [] },
                []
            );
            let totalSupplyAfterHex = await this.web3.eth.call({
                to: tokenAddress,
                data: totalSupplyCallData
            });
            let totalSupplyAfterDecoded = this.web3.eth.abi.decodeParameter('uint256', totalSupplyAfterHex);
            let totalSupplyAfter = this.web3.utils.toBN(totalSupplyAfterDecoded);
            let actualSupplyIncrease = totalSupplyAfter.sub(totalSupplyBefore);
            if (actualSupplyIncrease.lt(expectedIncrease)) {
                await new Promise(r => setTimeout(r, 2000));
                totalSupplyAfterHex = await this.web3.eth.call({
                    to: tokenAddress,
                    data: totalSupplyCallData
                });
                totalSupplyAfterDecoded = this.web3.eth.abi.decodeParameter('uint256', totalSupplyAfterHex);
                totalSupplyAfter = this.web3.utils.toBN(totalSupplyAfterDecoded);
                actualSupplyIncrease = totalSupplyAfter.sub(totalSupplyBefore);
            }
            this.assertTest(
                actualSupplyIncrease.eq(expectedIncrease),
                `Tokens minted: totalSupply must increase by 100e18 (got +${this.web3.utils.fromWei(actualSupplyIncrease.toString(), 'ether')})`
            );
            console.log(`  ✅ Verified: tokens were minted (totalSupply +100e18)`);

            await this.passTest('Verify tokens minted and passed to destination', 'Balance +100e18, totalSupply +100e18');
        } catch (error) {
            await this.failTest('Verify tokens minted and passed to destination', error);
            throw error;
        }
    }
}

module.exports = ERC20MintControllerTests;

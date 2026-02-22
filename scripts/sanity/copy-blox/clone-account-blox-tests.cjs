/**
 * CopyBlox Sanity: Clone AccountBlox
 * Uses CopyBlox to clone the AccountBlox implementation and verifies clone state
 */

const path = require('path');
const BaseCopyBloxTest = require('./base-test.cjs');

class CloneAccountBloxTests extends BaseCopyBloxTest {
    constructor() {
        super('CopyBlox Clone AccountBlox');
    }

    async executeTests() {
        await this.testInitialCloneCount();
        await this.testCloneAccountBlox();
        await this.testCloneStateAndRegistry();
        await this.testSecondCloneIncrementsCount();
    }

    async testInitialCloneCount() {
        await this.startTest('Verify initial clone count is zero or existing');

        try {
            const count = await this.callMethod(this.contract.methods.getCloneCount);
            console.log(`   getCloneCount(): ${count}`);
            await this.passTest('Initial clone count', `Count = ${count}`);
        } catch (error) {
            await this.failTest('Initial clone count', error);
        }
    }

    async testCloneAccountBlox() {
        await this.startTest('Clone AccountBlox via CopyBlox.cloneBlox');

        try {
            const initialOwner = this.wallets.owner.address;
            const broadcaster = this.wallets.broadcaster.address;
            const recovery = this.wallets.recovery.address;

            const tx = await this.executeTransaction(
                this.contract.methods.cloneBlox,
                [
                    this.accountBloxAddress,
                    initialOwner,
                    broadcaster,
                    recovery,
                    this.timeLockPeriodSec
                ]
            );

            console.log(`   Transaction hash: ${tx.transactionHash}`);
            console.log(`   Blox (original): ${this.accountBloxAddress}`);
            console.log(`   initialOwner: ${initialOwner}`);
            console.log(`   broadcaster: ${broadcaster}`);
            console.log(`   recovery: ${recovery}`);
            console.log(`   timeLockPeriodSec: ${this.timeLockPeriodSec}`);

            // Decode BloxCloned event to get clone address
            const events = tx.events;
            let cloneAddress = null;
            if (events && events.BloxCloned) {
                const e = Array.isArray(events.BloxCloned) ? events.BloxCloned[0] : events.BloxCloned;
                cloneAddress = e.returnValues.clone;
            }
            if (!cloneAddress && events) {
                const keys = Object.keys(events);
                for (const k of keys) {
                    const v = events[k];
                    const arr = Array.isArray(v) ? v : [v];
                    for (const item of arr) {
                        if (item.returnValues && item.returnValues.clone) {
                            cloneAddress = item.returnValues.clone;
                            break;
                        }
                    }
                    if (cloneAddress) break;
                }
            }

            if (!cloneAddress) {
                // Fallback: get clone at index 0 (if this was the first clone)
                const count = await this.callMethod(this.contract.methods.getCloneCount);
                if (count > 0) {
                    cloneAddress = await this.callMethod(this.contract.methods.getCloneAtIndex, ['0']);
                }
            }

            if (!cloneAddress || cloneAddress === '0x0000000000000000000000000000000000000000') {
                throw new Error('Could not determine clone address from tx events or getCloneAtIndex(0)');
            }

            this.lastCloneAddress = cloneAddress;
            console.log(`   Clone address: ${cloneAddress}`);
            await this.passTest('Clone AccountBlox', `Clone at ${cloneAddress}`);
        } catch (error) {
            await this.failTest('Clone AccountBlox', error);
            throw error;
        }
    }

    async testCloneStateAndRegistry() {
        await this.startTest('Verify clone state and CopyBlox registry');

        if (!this.lastCloneAddress) {
            console.log('   Skipped (no clone from previous test)');
            return;
        }

        try {
            const cloneAddress = this.lastCloneAddress;

            const isClone = await this.callMethod(this.contract.methods.isClone, [cloneAddress]);
            if (!isClone) {
                throw new Error(`isClone(${cloneAddress}) expected true, got false`);
            }
            console.log(`   isClone(clone): true`);

            const count = await this.callMethod(this.contract.methods.getCloneCount);
            const lastIndex = String(Number(count) - 1);
            const atLastIndex = await this.callMethod(this.contract.methods.getCloneAtIndex, [lastIndex]);
            if (atLastIndex.toLowerCase() !== cloneAddress.toLowerCase()) {
                throw new Error(`getCloneAtIndex(${lastIndex}) expected ${cloneAddress}, got ${atLastIndex}`);
            }
            console.log(`   getCloneCount(): ${count}`);
            console.log(`   getCloneAtIndex(${lastIndex}): ${atLastIndex}`);

            // Verify cloned blox has correct owner, broadcaster, recovery (AccountBlox interface)
            const accountBloxABI = this.loadABI('AccountBlox');
            const cloneContract = new this.web3.eth.Contract(accountBloxABI, cloneAddress);

            const owner = await cloneContract.methods.owner().call();
            const broadcasters = await cloneContract.methods.getBroadcasters().call();
            const broadcaster = Array.isArray(broadcasters) && broadcasters.length > 0 ? broadcasters[0] : broadcasters;
            const recovery = await cloneContract.methods.getRecovery().call();

            const expectedOwner = this.wallets.owner.address;
            const expectedBroadcaster = this.wallets.broadcaster.address;
            const expectedRecovery = this.wallets.recovery.address;

            if (owner.toLowerCase() !== expectedOwner.toLowerCase()) {
                throw new Error(`Clone owner expected ${expectedOwner}, got ${owner}`);
            }
            if (broadcaster.toLowerCase() !== expectedBroadcaster.toLowerCase()) {
                throw new Error(`Clone broadcaster expected ${expectedBroadcaster}, got ${broadcaster}`);
            }
            if (recovery.toLowerCase() !== expectedRecovery.toLowerCase()) {
                throw new Error(`Clone recovery expected ${expectedRecovery}, got ${recovery}`);
            }

            console.log(`   Clone owner: ${owner}`);
            console.log(`   Clone broadcaster: ${broadcaster}`);
            console.log(`   Clone recovery: ${recovery}`);
            await this.passTest('Clone state and registry', 'Clone is registered and initialized correctly');
        } catch (error) {
            await this.failTest('Clone state and registry', error);
        }
    }

    async testSecondCloneIncrementsCount() {
        await this.startTest('Second clone increments getCloneCount');

        try {
            const countBefore = await this.callMethod(this.contract.methods.getCloneCount);

            await this.executeTransaction(
                this.contract.methods.cloneBlox,
                [
                    this.accountBloxAddress,
                    this.wallets.owner.address,
                    this.wallets.broadcaster.address,
                    this.wallets.recovery.address,
                    this.timeLockPeriodSec
                ]
            );

            const countAfter = await this.callMethod(this.contract.methods.getCloneCount);
            const expected = Number(countBefore) + 1;
            if (Number(countAfter) !== expected) {
                throw new Error(`getCloneCount expected ${expected}, got ${countAfter}`);
            }

            const secondClone = await this.callMethod(this.contract.methods.getCloneAtIndex, [String(countBefore)]);
            if (!secondClone || secondClone === '0x0000000000000000000000000000000000000000') {
                throw new Error('getCloneAtIndex(countBefore) should return second clone address');
            }
            console.log(`   getCloneCount before: ${countBefore}, after: ${countAfter}`);
            console.log(`   Second clone: ${secondClone}`);
            await this.passTest('Second clone increments count', `Count: ${countBefore} -> ${countAfter}`);
        } catch (error) {
            await this.failTest('Second clone increments count', error);
        }
    }
}

module.exports = CloneAccountBloxTests;

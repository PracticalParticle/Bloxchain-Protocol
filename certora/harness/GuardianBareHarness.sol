// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

import "../../contracts/GuardianBare.sol";
import "../../contracts/core/base/lib/StateAbstraction.sol";

/**
 * @title GuardianBareHarness
 * @dev Simplified test harness extending GuardianBare for Certora formal verification
 * 
 * This harness exposes only the essential state and functions needed for verification
 * without complex nested structure access that causes compilation issues.
 */
contract GuardianBareHarness is GuardianBare {
    
    // ============ BASIC STATE ACCESSORS ============
    
    /**
     * @dev Check if secure state is initialized
     * @return True if initialized, false otherwise
     */
    function getSecureStateInitialized() external view returns (bool) {
        return _secureState.initialized;
    }

    /**
     * @dev Get transaction counter
     * @return Current transaction counter value
     */
    function getTxCounter() external view returns (uint256) {
        return _secureState.txCounter;
    }

    /**
     * @dev Expose time lock period
     * @return Time lock period in seconds
     */
    function getTimeLockPeriodSec() public view override returns (uint256) {
        return _secureState.timeLockPeriodSec;
    }

    /**
     * @dev Expose event forwarder address
     * @return Event forwarder address
     */
    function getEventForwarder() external view returns (address) {
        return _secureState.eventForwarder;
    }

    // ============ TRANSACTION ACCESSORS ============

    /**
     * @dev Get transaction record status
     * @param txId The transaction ID
     * @return Transaction status
     */
    function getTxRecordStatus(uint256 txId) external view returns (uint8) {
        return uint8(_secureState.txRecords[txId].status);
    }

    /**
     * @dev Get transaction record release time
     * @param txId The transaction ID
     * @return Release time timestamp
     */
    function getTxRecordReleaseTime(uint256 txId) external view returns (uint256) {
        return _secureState.txRecords[txId].releaseTime;
    }

    /**
     * @dev Get transaction record requester
     * @param txId The transaction ID
     * @return Requester address
     */
    function getTxRecordRequester(uint256 txId) external view returns (address) {
        return _secureState.txRecords[txId].params.requester;
    }

    /**
     * @dev Get transaction record target
     * @param txId The transaction ID
     * @return Target address
     */
    function getTxRecordTarget(uint256 txId) external view returns (address) {
        return _secureState.txRecords[txId].params.target;
    }

    /**
     * @dev Get transaction record operation type
     * @param txId The transaction ID
     * @return Operation type hash
     */
    function getTxRecordOperationType(uint256 txId) external view returns (bytes32) {
        return _secureState.txRecords[txId].params.operationType;
    }

    /**
     * @dev Get transaction record execution type
     * @param txId The transaction ID
     * @return Execution type
     */
    function getTxRecordExecutionType(uint256 txId) external view returns (uint8) {
        return uint8(_secureState.txRecords[txId].params.executionType);
    }

    /**
     * @dev Get transaction record message
     * @param txId The transaction ID
     * @return Message hash
     */
    function getTxRecordMessage(uint256 txId) external view returns (bytes32) {
        return _secureState.txRecords[txId].message;
    }

    /**
     * @dev Get count of pending transactions using base contract function
     * @return Number of pending transactions
     */
    function getPendingTxCount() external view returns (uint256) {
        return getPendingTransactions().length;
    }

    /**
     * @dev Check if transaction ID is in pending set using base contract function
     * @param txId The transaction ID to check
     * @return True if pending, false otherwise
     */
    function isPendingTx(uint256 txId) external view returns (bool) {
        uint256[] memory pendingTxs = getPendingTransactions();
        for (uint256 i = 0; i < pendingTxs.length; i++) {
            if (pendingTxs[i] == txId) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get pending transaction at index using base contract function
     * @param index The index in the pending set
     * @return Transaction ID at index
     */
    function getPendingTxAt(uint256 index) external view returns (uint256) {
        uint256[] memory pendingTxs = getPendingTransactions();
        require(index < pendingTxs.length, "Index out of bounds");
        return pendingTxs[index];
    }

    // ============ ROLE ACCESSORS ============

    /**
     * @dev Get role wallet count using base contract function
     * @param roleHash The role hash
     * @return Number of wallets in role
     */
    function getRoleWalletCount(bytes32 roleHash) external view returns (uint256) {
        return _secureState.roles[roleHash].walletCount;
    }

    /**
     * @dev Get role max wallets
     * @param roleHash The role hash
     * @return Maximum number of wallets allowed
     */
    function getRoleMaxWallets(bytes32 roleHash) external view returns (uint256) {
        return _secureState.roles[roleHash].maxWallets;
    }

    /**
     * @dev Check if role is protected
     * @param roleHash The role hash
     * @return True if protected, false otherwise
     */
    function isProtectedRole(bytes32 roleHash) external view returns (bool) {
        return _secureState.roles[roleHash].isProtected;
    }

    /**
     * @dev Get role name
     * @param roleHash The role hash
     * @return Role name string
     */
    function getRoleName(bytes32 roleHash) external view returns (string memory) {
        return _secureState.roles[roleHash].roleName;
    }

    // ============ FUNCTION SCHEMA ACCESSORS ============

    /**
     * @dev Get function schema operation type
     * @param functionSelector The function selector
     * @return Operation type hash
     */
    function getFunctionSchemaOperationType(bytes4 functionSelector) external view returns (bytes32) {
        return _secureState.functions[functionSelector].operationType;
    }

    /**
     * @dev Get function schema name
     * @param functionSelector The function selector
     * @return Function name string
     */
    function getFunctionSchemaName(bytes4 functionSelector) external view returns (string memory) {
        return _secureState.functions[functionSelector].functionName;
    }

    // ============ META-TRANSACTION ACCESSORS ============


    // ============ BITMAP HELPER EXPOSURES ============

    /**
     * @dev Expose bitmap action checking
     * @param bitmap The permission bitmap
     * @param action The action to check
     * @return True if action is granted, false otherwise
     */
    function hasActionInBitmapExposed(uint16 bitmap, uint8 action) external pure returns (bool) {
        return StateAbstraction.hasActionInBitmap(bitmap, StateAbstraction.TxAction(action));
    }


    // ============ HELPER FUNCTIONS FOR INVARIANTS ============

    /**
     * @dev Get total transaction count
     * @return Total number of transactions ever created
     */
    function getTotalTxCount() external view returns (uint256) {
        return _secureState.txCounter;
    }

    /**
     * @dev Check if transaction exists
     * @param txId The transaction ID
     * @return True if transaction exists, false otherwise
     */
    function txExists(uint256 txId) external view returns (bool) {
        return _secureState.txRecords[txId].txId != 0;
    }

    /**
     * @dev Get current block timestamp
     * @return Current timestamp
     */
    function currentTime() external view returns (uint256) {
        return block.timestamp;
    }

    /**
     * @dev Get current chain ID
     * @return Current chain ID
     */
    function currentChainId() external view returns (uint256) {
        return block.chainid;
    }
}
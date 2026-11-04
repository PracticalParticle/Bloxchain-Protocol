// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.35;

import "../CommonBase.sol";
import "../../../contracts/examples/applications/SimpleRWA20/SimpleRWA20.sol";
import "../../../contracts/examples/applications/SimpleRWA20/SimpleRWA20Definitions.sol";

/**
 * @title SimpleRWA20WiringTest
 * @dev SPEC-2026-0175 R4: mint/burn meta selectors use the double-wrap form (stamped handler == msg.sig) and the
 *      mint/burn wrappers no longer nest `nonReentrant` around `_requestAndApproveTransaction`.
 */
contract SimpleRWA20WiringTest is CommonBase {
    SimpleRWA20 internal token;
    address internal holder;

    uint256 internal constant OWNER_PK = 1;

    function setUp() public override {
        super.setUp();
        holder = address(0xA11CE);
        token = new SimpleRWA20();
        token.initialize("RWA", "RWA", owner, broadcaster, recovery, DEFAULT_TIMELOCK_PERIOD, address(mockEventForwarder));
    }

    function _params() internal pure returns (SimpleRWA20.TokenMetaTxParams memory) {
        return SimpleRWA20.TokenMetaTxParams({deadline: 3600, maxGasPrice: 0});
    }

    function _status(uint256 txId) internal returns (EngineBlox.TxStatus) {
        vm.prank(owner);
        return token.getTransaction(txId).status;
    }

    function _mint(address to, uint256 amount) internal returns (uint256 txId) {
        EngineBlox.MetaTransaction memory m = token.generateUnsignedMintMetaTx(to, amount, _params());
        m.signature = metaTxSigner.signMetaTransaction(m, OWNER_PK, address(token));
        vm.prank(broadcaster);
        txId = token.mintWithMetaTx(m);
    }

    // ============ selector shape ============

    function test_MetaSelectors_MatchEntrypoints() public pure {
        assertEq(SimpleRWA20Definitions.MINT_TOKENS_META_SELECTOR, SimpleRWA20.mintWithMetaTx.selector);
        assertEq(SimpleRWA20Definitions.BURN_TOKENS_META_SELECTOR, SimpleRWA20.burnWithMetaTx.selector);
        assertEq(SimpleRWA20Definitions.MINT_TOKENS_SELECTOR, SimpleRWA20.executeMint.selector);
        assertEq(SimpleRWA20Definitions.BURN_TOKENS_SELECTOR, SimpleRWA20.executeBurn.selector);
    }

    function test_GenerateUnsigned_StampsEntrypointSelector() public view {
        EngineBlox.MetaTransaction memory m = token.generateUnsignedMintMetaTx(holder, 1 ether, _params());
        assertEq(m.params.handlerSelector, SimpleRWA20.mintWithMetaTx.selector);
    }

    // ============ AC4: meta mint / burn bind and change supply ============

    function test_MetaMint_IncreasesSupply() public {
        uint256 txId = _mint(holder, 100 ether);
        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(token.balanceOf(holder), 100 ether);
        assertEq(token.totalSupply(), 100 ether);
    }

    function test_MetaBurn_DecreasesSupply() public {
        _mint(holder, 100 ether);
        // executeBurn uses burnFrom with the token contract as spender
        vm.prank(holder);
        token.approve(address(token), 40 ether);

        EngineBlox.MetaTransaction memory m = token.generateUnsignedBurnMetaTx(holder, 40 ether, _params());
        assertEq(m.params.handlerSelector, SimpleRWA20.burnWithMetaTx.selector);
        m.signature = metaTxSigner.signMetaTransaction(m, OWNER_PK, address(token));

        vm.prank(broadcaster);
        uint256 txId = token.burnWithMetaTx(m);

        assertEq(uint8(_status(txId)), uint8(EngineBlox.TxStatus.COMPLETED));
        assertEq(token.balanceOf(holder), 60 ether);
        assertEq(token.totalSupply(), 60 ether);
    }

    function test_MetaMint_SubmittedToBurnEntrypoint_Reverts() public {
        EngineBlox.MetaTransaction memory m = token.generateUnsignedMintMetaTx(holder, 1 ether, _params());
        m.signature = metaTxSigner.signMetaTransaction(m, OWNER_PK, address(token));
        vm.prank(broadcaster);
        vm.expectRevert();
        token.burnWithMetaTx(m);
        assertEq(token.totalSupply(), 0);
    }

    function test_MetaMint_NonBroadcaster_Reverts() public {
        EngineBlox.MetaTransaction memory m = token.generateUnsignedMintMetaTx(holder, 1 ether, _params());
        m.signature = metaTxSigner.signMetaTransaction(m, OWNER_PK, address(token));
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SharedValidation.NoPermission.selector, attacker));
        token.mintWithMetaTx(m);
    }

    function test_MetaMint_Replay_Reverts() public {
        EngineBlox.MetaTransaction memory m = token.generateUnsignedMintMetaTx(holder, 1 ether, _params());
        m.signature = metaTxSigner.signMetaTransaction(m, OWNER_PK, address(token));
        vm.prank(broadcaster);
        token.mintWithMetaTx(m);
        vm.prank(broadcaster);
        vm.expectRevert();
        token.mintWithMetaTx(m);
        assertEq(token.totalSupply(), 1 ether);
    }
}

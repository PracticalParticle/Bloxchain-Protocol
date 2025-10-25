// Minimal test specification for Certora
using GuardianBareHarness as Contract;

methods {
    function getSecureStateInitialized() external returns (bool) envfree;
}

rule testInitializationState() {
    bool isInitialized = getSecureStateInitialized();
    assert !isInitialized;
}
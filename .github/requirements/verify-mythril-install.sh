#!/usr/bin/env bash
set -euo pipefail
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends gcc python3-dev >/dev/null
fi
python -m venv /tmp/venv-mythril-verify
/tmp/venv-mythril-verify/bin/pip install -q --upgrade pip
# Mythril 0.24.8 metadata caps eth-abi<5; lockfile pins eth-abi>=5.0.1 for GHSA-3qwc-47jf-5rf7.
/tmp/venv-mythril-verify/bin/pip install --require-hashes --no-deps -r .github/requirements/mythril.txt
/tmp/venv-mythril-verify/bin/myth version
/tmp/venv-mythril-verify/bin/python -c "import eth_abi; from eth_abi import encode; print('eth_abi', eth_abi.__version__); print('encode smoke', encode(['uint256'], [1]))"

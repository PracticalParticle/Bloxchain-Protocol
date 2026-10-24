#!/usr/bin/env bash
set -euo pipefail
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends gcc python3-dev >/dev/null
fi
if command -v python3.11 >/dev/null 2>&1; then
  PYTHON=python3.11
elif command -v python >/dev/null 2>&1 && python -c 'import sys; raise SystemExit(0 if sys.version_info[:2] == (3, 11) else 1)'; then
  PYTHON=python
else
  echo "Python 3.11 is required to install .github/requirements/mythril.txt" >&2
  exit 1
fi
VENV_DIR="$(mktemp -d)"
trap 'rm -rf "$VENV_DIR"' EXIT
"$PYTHON" -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install -q --upgrade pip
# Mythril 0.24.8 metadata caps eth-abi<5; lockfile pins eth-abi>=5.0.1 for GHSA-3qwc-47jf-5rf7.
"$VENV_DIR/bin/pip" install --require-hashes --no-deps -r .github/requirements/mythril.txt
"$VENV_DIR/bin/myth" version
"$VENV_DIR/bin/python" -c "import eth_abi; from eth_abi import encode; print('eth_abi', eth_abi.__version__); print('encode smoke', encode(['uint256'], [1]))"

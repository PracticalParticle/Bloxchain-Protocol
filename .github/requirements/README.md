# Security analyzer lockfiles

Particle CI installs Slither and Mythril from hash-verified lockfiles so manual
security scans do not resolve mutable transitive dependencies at run time.

- `slither.in` is the direct dependency input for `slither.txt`.
- `mythril.in` records the direct Mythril pin and its `pytest-cov` compatibility
  constraint.
- `mythril-resolved.in` is the Python 3.10 resolved graph used to generate
  `mythril.txt`. Mythril 0.24.8 requires `coverage<7`, so unconstrained current
  `pytest-cov` releases are incompatible.

Regenerate the `.txt` files with Python 3.10 and `pip-compile
--generate-hashes`. Verify them by installing with:

```bash
python -m pip install --require-hashes -r .github/requirements/slither.txt
python -m pip install --require-hashes -r .github/requirements/mythril.txt
```

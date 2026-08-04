# Black Box Testing Checklist for Executables/Binaries

## Test Categories

### 1. Functional Testing
- [ ] **Valid Inputs** - Test with expected valid inputs (CLI args, stdin, config files)
- [ ] **Invalid Inputs** - Test with malformed, out-of-range, or unexpected inputs
- [ ] **Edge Cases** - Boundary values, empty inputs, maximum lengths
- [ ] **Feature Coverage** - Verify each documented feature/command works
- [ ] **Error Handling** - Check error messages, exit codes, stderr output

### 2. Input Vector Testing
- [ ] **Command-line Arguments**
  - [ ] Required vs optional args
  - [ ] Short (`-f`) and long (`--flag`) forms
  - [ ] Combined flags (`-abc`)
  - [ ] Arguments with values (`-o file.txt`)
  - [ ] Repeated flags
  - [ ] Conflicting flags
- [ ] **Standard Input (stdin)**
  - [ ] Piped input
  - [ ] Redirected files
  - [ ] Empty stdin
  - [ ] Large input streams
- [ ] **Environment Variables** - Test with/without relevant env vars
- [ ] **Configuration Files** - Valid, invalid, missing, permission issues
- [ ] **File Arguments** - Paths (absolute, relative, symlinks, special chars)

### 3. Boundary Value Analysis
- [ ] **Numeric Limits** - Min, max, min-1, max+1 for all numeric params
- [ ] **String Lengths** - Empty, 1 char, max length, max+1
- [ ] **File Sizes** - 0 bytes, small, large, >4GB, max filesystem
- [ ] **Array/Count Limits** - 0, 1, max, max+1 items
- [ ] **Timeout Values** - 0, 1, max, negative

### 4. Equivalence Partitioning
- [ ] **Valid Partitions** - Group inputs that should behave identically
- [ ] **Invalid Partitions** - Group inputs that should produce same error
- [ ] **Special Values** - Null, whitespace, unicode, control chars

### 5. Security Testing
- [ ] **Input Injection** - Command injection, path traversal, format strings
- [ ] **Buffer Overflows** - Oversized inputs to all entry points
- [ ] **Race Conditions** - TOCTOU, temp file handling
- [ ] **Privilege Escalation** - SUID/SGID, capabilities, DLL hijacking
- [ ] **Information Disclosure** - Stack traces, memory leaks, debug output
- [ ] **Cryptographic Issues** - Weak randomness, hardcoded secrets

### 6. Robustness/Fuzzing
- [ ] **Random Fuzzing** - AFL, libFuzzer, honggfuzz
- [ ] **Structure-Aware Fuzzing** - For structured formats (ELF, PE, JSON)
- [ ] **Mutation Testing** - Bit flips, byte insertion/deletion
- [ ] **Protocol Fuzzing** - If binary speaks network protocols

### 7. Compatibility Testing
- [ ] **OS Versions** - Target OS versions (Windows 10/11, Linux distros, macOS)
- [ ] **Architectures** - x86, x64, ARM64, ARMv7
- [ ] **Dependencies** - Missing, wrong version, conflicting libs
- [ ] **Locale/Encoding** - UTF-8, UTF-16, ASCII, locale-specific
- [ ] **Filesystems** - NTFS, ext4, FAT32, network shares

### 8. Performance Testing
- [ ] **Startup Time** - Cold vs warm start
- [ ] **Memory Usage** - Baseline, under load, leak detection
- [ ] **CPU Utilization** - Idle, typical, peak load
- [ ] **Throughput** - Operations/sec, data processing rate
- [ ] **Scalability** - Large inputs, many files, concurrent runs

### 9. Reliability Testing
- [ ] **Stress Testing** - Resource exhaustion (memory, handles, disk)
- [ ] **Crash Recovery** - State after crash, temp file cleanup
- [ ] **Interruption Handling** - Ctrl+C, SIGTERM, power loss simulation
- [ ] **Long-running Stability** - Memory leaks, handle leaks over time

### 10. Output Verification
- [ ] **Exit Codes** - 0 for success, non-zero for specific errors
- [ ] **Stdout Format** - Expected structure, encoding, line endings
- [ ] **Stderr Content** - Errors, warnings, progress, debug info
- [ ] **File Output** - Created files, permissions, content correctness
- [ ] **Side Effects** - Registry, config changes, network calls

### 11. Regression Testing
- [ ] **Previous Bug Fixes** - Verify fixed issues don't regress
- [ ] **Version Upgrades** - Compare behavior across versions
- [ ] **Configuration Migration** - Old configs work with new version

### 12. Documentation Verification
- [ ] **Help Text** - `--help`, `-h`, man pages match actual behavior
- [ ] **Examples** - Documented examples produce expected output
- [ ] **Changelog** - New features documented, breaking changes noted

## Test Execution Process

### Pre-Test Setup
1. [ ] Isolate test environment (VM, container, sandbox)
2. [ ] Baseline clean system state (snapshot)
3. [ ] Prepare test data corpus (valid, invalid, edge cases)
4. [ ] Configure monitoring (memory, CPU, file handles, network)

### Test Execution
1. [ ] Run functional test suite
2. [ ] Execute boundary/equivalence tests
3. [ ] Run security-focused test cases
4. [ ] Execute fuzzing campaigns (time-boxed)
5. [ ] Run compatibility matrix
6. [ ] Execute performance benchmarks
7. [ ] Run reliability/stress tests

### Post-Test Analysis
1. [ ] Collect logs, crash dumps, sanitizer output
2. [ ] Compare outputs against baselines
3. [ ] Categorize findings (critical, high, medium, low, info)
4. [ ] Verify reproducibility of failures
5. [ ] Document test coverage gaps

## Tooling Suggestions

| Category | Tools |
|----------|-------|
| Fuzzing | AFL++, libFuzzer, honggfuzz, WinAFL |
| Dynamic Analysis | Valgrind, ASan/MSan/TSan, Dr. Memory |
| Binary Analysis | IDA Pro, Ghidra, Binary Ninja, radare2 |
| Monitoring | procmon, strace, ltrace, dtruss, Wireshark |
| Automation | Python (subprocess), Bash, Expect, Cucumber |
| CI/CD | GitHub Actions, GitLab CI, Jenkins |

## Reporting Template

```
Test Case: [ID]
Category: [Functional/Security/Performance/etc.]
Description: [What is being tested]
Input: [Exact command/input used]
Expected: [Expected behavior/output]
Actual: [Observed behavior/output]
Status: [Pass/Fail/Blocked]
Severity: [Critical/High/Medium/Low/Info]
Evidence: [Logs, screenshots, crash dumps]
```

## Coverage Metrics to Track
- [ ] Command-line option coverage (%)
- [ ] Code coverage (if source available) / Basic block coverage
- [ ] Input format coverage (grammar-based)
- [ ] Error path coverage
- [ ] Platform/architecture coverage
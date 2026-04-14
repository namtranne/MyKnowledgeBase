---
sidebar_position: 4
title: "03 — Cryptography & Secure Design"
slug: 03-cryptography-secure-design
---

# 🔑 Cryptography & Secure Design

Cryptography is the foundation of digital trust. This chapter covers the cryptographic primitives you must understand as a senior engineer — not to implement your own crypto (never do that), but to make informed design decisions about hashing, encryption, TLS, and secrets management.

---

## 1. Encoding vs Hashing vs Encryption

| Dimension | Encoding | Hashing | Encryption |
|-----------|----------|---------|------------|
| **Purpose** | Data representation/transport | Integrity verification, fingerprinting | Confidentiality |
| **Reversible?** | ✅ Yes (no secret needed) | ❌ No (one-way) | ✅ Yes (with key) |
| **Key required?** | ❌ No | ❌ No | ✅ Yes |
| **Output size** | Variable | Fixed (e.g., 256 bits) | Variable (≥ input size) |
| **Deterministic?** | ✅ Yes | ✅ Yes | ❌ No (with IV/nonce) |
| **Use case** | Base64 for binary-to-text, URL encoding | Password storage, checksums, dedup | Protecting data at rest/in transit |
| **Examples** | Base64, URL encoding, UTF-8 | SHA-256, bcrypt, MD5 | AES-256-GCM, RSA, ChaCha20 |
| **Security?** | ❌ None — not a security mechanism | ✅ Integrity only | ✅ Confidentiality + integrity (AEAD) |

```python
import base64, hashlib
from cryptography.fernet import Fernet

data = b"Hello, World!"

# Encoding — reversible, no secret
encoded = base64.b64encode(data)           # b'SGVsbG8sIFdvcmxkIQ=='
decoded = base64.b64decode(encoded)        # b'Hello, World!'

# Hashing — one-way, fixed size
hashed = hashlib.sha256(data).hexdigest()  # 'dffd6021bb2bd5b0af676290809...'

# Encryption — reversible with key
key = Fernet.generate_key()
cipher = Fernet(key)
encrypted = cipher.encrypt(data)           # b'gAAAAA...' (different each time)
decrypted = cipher.decrypt(encrypted)      # b'Hello, World!'
```

:::warning
Base64 is **not encryption**. It's trivially reversible. Never use encoding as a security measure — `Authorization: Basic dXNlcjpwYXNz` is just `user:pass` in Base64.
:::

---

## 2. Symmetric Encryption

Uses a **single shared key** for both encryption and decryption. Fast and efficient for bulk data.

### AES (Advanced Encryption Standard)

| Property | Value |
|----------|-------|
| **Key sizes** | 128, 192, or 256 bits |
| **Block size** | 128 bits (16 bytes) |
| **Type** | Block cipher |
| **Standard** | NIST (FIPS 197), adopted 2001 |
| **Speed** | Very fast (hardware-accelerated via AES-NI) |

### Block Cipher Modes

| Mode | Name | IV/Nonce | Auth | Parallelizable | Use Case |
|------|------|:--------:|:----:|:--------------:|----------|
| **ECB** | Electronic Codebook | ❌ | ❌ | ✅ | ❌ Never use — identical blocks produce identical ciphertext |
| **CBC** | Cipher Block Chaining | ✅ IV | ❌ | Decrypt only | Legacy — vulnerable to padding oracle attacks |
| **CTR** | Counter | ✅ Nonce | ❌ | ✅ | Stream-like encryption |
| **GCM** | Galois/Counter Mode | ✅ Nonce | ✅ | ✅ | ✅ **Recommended** — encryption + authentication |

### Why ECB Is Dangerous

```
Plaintext blocks:   [Block A] [Block B] [Block A] [Block C]
ECB ciphertext:     [Cipher1] [Cipher2] [Cipher1] [Cipher3]
                                         ^^^^^^^^
                              Same plaintext → same ciphertext!
                              Reveals patterns (e.g., the famous ECB penguin)

CBC/GCM ciphertext: [Cipher1] [Cipher2] [Cipher5] [Cipher8]
                                         ^^^^^^^^
                              Same plaintext → different ciphertext
```

### AES-256-GCM Example

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

key = AESGCM.generate_key(bit_length=256)  # 32 bytes
nonce = os.urandom(12)                       # 96-bit nonce for GCM
aad = b"metadata-not-encrypted-but-authenticated"

aesgcm = AESGCM(key)
ciphertext = aesgcm.encrypt(nonce, b"secret data", aad)
plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
# If ciphertext or AAD is tampered with, decrypt raises InvalidTag
```

:::tip Senior-Level Insight
Always use **authenticated encryption** (AEAD) — AES-GCM or ChaCha20-Poly1305. Unauthenticated modes (CBC, CTR) are vulnerable to chosen-ciphertext attacks. GCM provides both confidentiality and integrity in a single operation. Never reuse a nonce with the same key in GCM — it catastrophically breaks security.
:::

---

## 3. Asymmetric Encryption

Uses a **key pair**: public key encrypts, private key decrypts (or vice versa for signing).

### RSA vs ECDSA vs Ed25519

| Algorithm | Type | Key Size | Speed | Security | Use Case |
|-----------|------|----------|-------|----------|----------|
| **RSA-2048** | Encryption + Signing | 2048+ bits | Slow | 112-bit equivalent | Legacy, TLS, JWT (RS256) |
| **RSA-4096** | Encryption + Signing | 4096 bits | Very slow | 128-bit equivalent | High-security RSA |
| **ECDSA P-256** | Signing only | 256 bits | Fast | 128-bit equivalent | TLS, JWT (ES256), Bitcoin |
| **Ed25519** | Signing only | 256 bits | Fastest | 128-bit equivalent | SSH keys, modern TLS, JWT (EdDSA) |
| **X25519** | Key exchange only | 256 bits | Fast | 128-bit equivalent | TLS 1.3 key exchange |

### Asymmetric Encryption Flow

```
┌─────────────┐                         ┌─────────────┐
│   Alice     │                         │    Bob      │
│             │                         │             │
│ Has:        │                         │ Has:        │
│ - her priv  │                         │ - his priv  │
│ - Bob's pub │                         │ - Alice's pub│
└──────┬──────┘                         └──────┬──────┘
       │                                       │
       │  1. Encrypt(message, Bob's public key) │
       │──────────────────────────────────────▶│
       │                                       │
       │                 2. Decrypt(ciphertext, │
       │                    Bob's private key)  │
       │                                       │
       │  Only Bob can decrypt (only he has    │
       │  the matching private key)            │
```

### When to Use What

| Need | Use |
|------|-----|
| Encrypt bulk data | AES-256-GCM (symmetric) |
| Encrypt for a specific recipient | RSA/ECIES (asymmetric wraps symmetric key) |
| Sign data / verify authenticity | ECDSA or Ed25519 |
| Key exchange | X25519 / ECDH |
| TLS | Asymmetric for handshake → symmetric for data |

---

## 4. Hashing

A hash function maps arbitrary-length input to a **fixed-size** output. Cryptographic hashes are one-way and collision-resistant.

### Hash Algorithm Comparison

| Algorithm | Output | Speed | Status | Use Case |
|-----------|--------|-------|--------|----------|
| **MD5** | 128 bits | Very fast | ❌ **Broken** — collisions found | Legacy checksums only |
| **SHA-1** | 160 bits | Fast | ❌ **Broken** — practical collisions | Git (legacy), being replaced |
| **SHA-256** | 256 bits | Fast | ✅ Secure | Checksums, blockchain, certificates |
| **SHA-3** | Variable | Moderate | ✅ Secure | Alternative to SHA-2 family |
| **BLAKE2** | Variable | Very fast | ✅ Secure | Fast checksums, non-password hashing |
| **bcrypt** | 184 bits | Intentionally slow | ✅ Secure | Password hashing |
| **Argon2** | Variable | Intentionally slow | ✅ Secure | **Best** for password hashing |

### Cryptographic vs Non-Cryptographic Hashes

| Property | Cryptographic (SHA-256) | Non-Cryptographic (MurmurHash) |
|----------|------------------------|-------------------------------|
| **Collision resistance** | ✅ Computationally infeasible | ❌ Not guaranteed |
| **Pre-image resistance** | ✅ Can't reverse the hash | ❌ Not a goal |
| **Speed** | Moderate | Very fast |
| **Use case** | Security (signatures, integrity) | Hash tables, bloom filters, sharding |

---

## 5. Password Storage Evolution

```
❌ Plaintext          "password123"
   │  Problem: DB breach = all passwords exposed
   ▼
❌ MD5 hash           "482c811da5d5b4bc..."
   │  Problem: Rainbow tables, fast brute force
   ▼
⚠️ SHA-256 hash       "ef92b778bafe771e..."
   │  Problem: Still fast, rainbow tables with salt
   ▼
⚠️ Salted SHA-256     salt + "ef92b778..." (unique salt per user)
   │  Problem: SHA is too fast — GPUs can try billions/sec
   ▼
✅ bcrypt             "$2b$12$LJ3m4ys..." (built-in salt, slow by design)
   │  Good: ~100ms per hash, memory-hard enough
   ▼
✅✅ Argon2id          "$argon2id$v=19$m=65536,t=3,p=4$..."
      Best: Memory-hard, configurable time/memory/parallelism
      Winner of Password Hashing Competition (2015)
```

### bcrypt vs scrypt vs Argon2

| Algorithm | CPU-Hard | Memory-Hard | Parallelism Resistant | Notes |
|-----------|:--------:|:-----------:|:--------------------:|-------|
| **bcrypt** | ✅ | ⚠️ Moderate | ⚠️ Moderate | Widely supported, 72-byte password limit |
| **scrypt** | ✅ | ✅ | ✅ | Configurable memory, used in Litecoin |
| **Argon2id** | ✅ | ✅ | ✅ | PHC winner, best overall, OWASP recommended |

### Argon2 Configuration

```python
import argon2

hasher = argon2.PasswordHasher(
    time_cost=3,        # iterations
    memory_cost=65536,  # 64 MB
    parallelism=4,      # threads
    hash_len=32,        # output length
    salt_len=16,        # salt length
)

hashed = hasher.hash("user_password")
# '$argon2id$v=19$m=65536,t=3,p=4$randomsalt$hashedoutput'

try:
    hasher.verify(hashed, "user_password")  # returns True
except argon2.exceptions.VerifyMismatchError:
    print("Invalid password")
```

:::tip Senior-Level Insight
OWASP recommends **Argon2id** with minimum settings: memory 19 MiB, iterations 2, parallelism 1. If Argon2 isn't available, use **bcrypt** with a work factor of at least 10 (2^10 iterations). Never use PBKDF2 with fewer than 600,000 iterations for SHA-256. The goal: make each hash take ~250ms on your hardware.
:::

---

## 6. Digital Signatures

Digital signatures provide **authentication**, **integrity**, and **non-repudiation**.

### How Digital Signatures Work

```
┌──────────────────────────────────────────────────────────┐
│                    SIGNING (Sender)                       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Document ──▶ Hash(SHA-256) ──▶ Encrypt(hash, priv_key)  │
│                                         │                │
│                                    Signature             │
│                                                          │
│  Send: Document + Signature                              │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                  VERIFICATION (Receiver)                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Document ──▶ Hash(SHA-256) ──▶ hash_A                   │
│                                                          │
│  Signature ──▶ Decrypt(sig, pub_key) ──▶ hash_B          │
│                                                          │
│  hash_A == hash_B ? ✅ Valid : ❌ Tampered               │
└──────────────────────────────────────────────────────────┘
```

### Use Cases

| Application | How Signatures Are Used |
|-------------|------------------------|
| **Code signing** | OS verifies software publisher (Apple, Microsoft) |
| **TLS certificates** | CA signs server's public key |
| **JWT** | Auth server signs tokens; API verifies |
| **Git commits** | GPG-signed commits prove author identity |
| **Email (S/MIME)** | Sender signs email body |
| **Blockchain** | Transaction authorization |
| **Software updates** | Verify update authenticity (apt, yum) |

---

## 7. TLS Handshake

TLS (Transport Layer Security) provides **encryption**, **authentication**, and **integrity** for data in transit.

### TLS 1.3 Handshake (1-RTT)

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │  Server  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │  ClientHello                                   │
     │  - supported cipher suites                     │
     │  - supported TLS versions                      │
     │  - client random                               │
     │  - key_share (ECDH public key)                 │
     │  - supported_groups (e.g., x25519)             │
     │──────────────────────────────────────────────▶│
     │                                               │
     │  ServerHello                                   │
     │  - chosen cipher suite                         │
     │  - server random                               │
     │  - key_share (ECDH public key)                 │
     │                                               │
     │  {EncryptedExtensions}                         │
     │  {Certificate}        ◀── server's X.509 cert  │
     │  {CertificateVerify}  ◀── signature proof      │
     │  {Finished}           ◀── handshake MAC        │
     │◀──────────────────────────────────────────────│
     │                                               │
     │  Both compute:                                 │
     │  shared_secret = ECDH(client_priv, server_pub) │
     │  session_keys = HKDF(shared_secret, randoms)   │
     │                                               │
     │  {Finished}                                    │
     │──────────────────────────────────────────────▶│
     │                                               │
     │  ═══════ Application Data (encrypted) ═══════  │
     │◀═════════════════════════════════════════════▶│
```

### TLS 1.2 vs TLS 1.3

| Feature | TLS 1.2 | TLS 1.3 |
|---------|---------|---------|
| **Round trips** | 2-RTT | 1-RTT (0-RTT resumption) |
| **Key exchange** | RSA, DHE, ECDHE | ECDHE only (forward secrecy mandatory) |
| **Cipher suites** | ~300 options | 5 strong options |
| **Removed** | — | RSA key exchange, CBC, RC4, SHA-1, compression |
| **0-RTT** | No | Yes (with replay protection caveats) |
| **Handshake encryption** | Partial (certificates in clear) | Full (certificates encrypted) |

---

## 8. Certificate Chain of Trust

### How Certificate Verification Works

```
┌─────────────────────────────────────────────────────────┐
│                    CERTIFICATE CHAIN                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐                                   │
│  │  Root CA         │ ◀── Pre-installed in OS/browser   │
│  │  (Self-signed)   │     trust store (~150 root CAs)   │
│  │  e.g., DigiCert  │                                   │
│  └────────┬─────────┘                                   │
│           │ signs                                       │
│           ▼                                             │
│  ┌──────────────────┐                                   │
│  │  Intermediate CA │ ◀── Signed by Root CA             │
│  │  e.g., Let's     │     Provides isolation (root key  │
│  │  Encrypt R3      │     kept offline)                 │
│  └────────┬─────────┘                                   │
│           │ signs                                       │
│           ▼                                             │
│  ┌──────────────────┐                                   │
│  │  Leaf Certificate│ ◀── Your server's certificate     │
│  │  CN=example.com  │     Contains: public key, domain, │
│  │                  │     validity, issuer               │
│  └──────────────────┘                                   │
│                                                         │
│  Verification: Browser walks chain upward, verifying    │
│  each signature until it reaches a trusted root CA.     │
└─────────────────────────────────────────────────────────┘
```

### Let's Encrypt & ACME

| Feature | Detail |
|---------|--------|
| **Cost** | Free |
| **Validity** | 90 days (encourages automation) |
| **Protocol** | ACME (Automated Certificate Management Environment) |
| **Validation** | HTTP-01 (file), DNS-01 (TXT record), TLS-ALPN-01 |
| **Wildcard** | ✅ via DNS-01 challenge only |
| **Rate limits** | 50 certs/domain/week, 300 new orders/3 hours |
| **Client** | Certbot, acme.sh, Caddy (built-in) |

---

## 9. Perfect Forward Secrecy (PFS)

PFS ensures that even if a server's **long-term private key is compromised**, past session data remains encrypted.

### Without PFS (RSA Key Exchange)

```
Session 1: Client encrypts pre-master secret with server's RSA public key
Session 2: Client encrypts pre-master secret with server's RSA public key
Session 3: Client encrypts pre-master secret with server's RSA public key

If server's RSA private key is later compromised:
  → Attacker decrypts ALL recorded sessions (1, 2, 3)
```

### With PFS (ECDHE Key Exchange)

```
Session 1: Ephemeral ECDH keypair (discarded after session)
Session 2: Ephemeral ECDH keypair (discarded after session)
Session 3: Ephemeral ECDH keypair (discarded after session)

If server's long-term key is later compromised:
  → Attacker CANNOT decrypt past sessions
  → Each session used unique ephemeral keys that no longer exist
```

:::tip Senior-Level Insight
TLS 1.3 **mandates** forward secrecy — RSA key exchange was removed entirely. In TLS 1.2, ensure your cipher suite uses `ECDHE` (not `RSA`) for key exchange. Example: prefer `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384` over `TLS_RSA_WITH_AES_256_GCM_SHA384`.
:::

---

## 10. Secrets Management

### The Problem

```
❌ Secrets anti-patterns:
   - Hardcoded in source code    → exposed in git history
   - In environment variables    → visible in /proc, ps, logs
   - In config files on disk     → accessible to any process on host
   - Shared via Slack/email      → no audit trail, no rotation
```

### Secrets Management Solutions

| Solution | Type | Key Features |
|----------|------|-------------|
| **HashiCorp Vault** | Self-hosted / HCP | Dynamic secrets, leasing, audit log, encryption-as-a-service |
| **AWS Secrets Manager** | Managed (AWS) | Auto-rotation, RDS integration, cross-account sharing |
| **AWS SSM Parameter Store** | Managed (AWS) | Free tier, hierarchical, KMS integration |
| **Azure Key Vault** | Managed (Azure) | HSM-backed, certificate management |
| **GCP Secret Manager** | Managed (GCP) | Versioning, IAM integration |
| **SOPS** | File-based | Encrypts values in YAML/JSON, git-friendly |
| **Doppler** | SaaS | Developer-friendly, environment sync |

### Vault Architecture

```
┌──────────────────────────────────────────────────────┐
│                   HashiCorp Vault                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Auth Methods │  │ Secret       │  │ Audit      │  │
│  │             │  │ Engines      │  │ Devices    │  │
│  │ - AppRole   │  │ - KV v2      │  │ - File     │  │
│  │ - K8s SA    │  │ - AWS (dyn)  │  │ - Syslog   │  │
│  │ - LDAP      │  │ - DB (dyn)   │  │ - Socket   │  │
│  │ - JWT/OIDC  │  │ - PKI        │  │            │  │
│  │ - TLS cert  │  │ - Transit    │  │            │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Storage Backend (Consul, Raft, S3, DynamoDB) │    │
│  │  (All data encrypted with master key)         │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  Master Key → unsealed with Shamir's Secret Sharing  │
│  (5 key shares, 3 required to unseal)                │
└──────────────────────────────────────────────────────┘
```

---

## 11. Key Rotation & Envelope Encryption

### Key Rotation

```
┌─────────────────────────────────────────────────────────┐
│                    KEY ROTATION                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Time 0:  Key v1 encrypts data                          │
│  Time 1:  Generate Key v2                               │
│           - New data encrypted with Key v2              │
│           - Old data re-encrypted with Key v2           │
│             (or lazily on next read)                    │
│  Time 2:  Key v1 marked for deletion                    │
│  Time 3:  Key v1 destroyed after all data migrated      │
│                                                         │
│  Why rotate?                                            │
│  - Limits blast radius of key compromise                │
│  - Compliance requirement (PCI DSS, HIPAA)              │
│  - Limits amount of data encrypted under one key        │
└─────────────────────────────────────────────────────────┘
```

### Envelope Encryption

```
┌──────────────────────────────────────────────────────────┐
│                  ENVELOPE ENCRYPTION                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────────────┐                                  │
│  │  KMS (Key Mgmt     │  Stores and protects the         │
│  │  Service)          │  Master Key (KEK)                │
│  └─────────┬──────────┘                                  │
│            │                                             │
│            │ 1. GenerateDataKey()                        │
│            ▼                                             │
│  ┌────────────────────┐                                  │
│  │ Returns:           │                                  │
│  │ - plaintext DEK    │  Data Encryption Key             │
│  │ - encrypted DEK    │  (DEK encrypted by KEK)          │
│  └─────────┬──────────┘                                  │
│            │                                             │
│            │ 2. Use plaintext DEK to encrypt data        │
│            ▼                                             │
│  ┌────────────────────┐                                  │
│  │ Store:             │                                  │
│  │ - encrypted data   │  Encrypted with DEK              │
│  │ - encrypted DEK    │  Encrypted with KEK              │
│  │ (discard plaintext │                                  │
│  │  DEK from memory)  │                                  │
│  └────────────────────┘                                  │
│                                                          │
│  Benefits:                                               │
│  - Only KEK needs to be in KMS (slow, expensive)         │
│  - DEK operations are local (fast, AES-NI)               │
│  - Rotating KEK doesn't require re-encrypting all data   │
│  - Each object can have its own DEK                      │
└──────────────────────────────────────────────────────────┘
```

:::tip Senior-Level Insight
Envelope encryption is how AWS S3, EBS, and RDS encryption work under the hood. The KMS holds the Customer Master Key (CMK). When you encrypt an S3 object, AWS generates a unique Data Encryption Key (DEK), encrypts the object with the DEK, encrypts the DEK with the CMK, and stores both together. This is why rotating a CMK in KMS doesn't require re-encrypting every S3 object.
:::

---

## 12. Hardware Security Modules (HSM)

An HSM is a **tamper-resistant hardware device** that generates, stores, and manages cryptographic keys. Keys never leave the HSM in plaintext.

### HSM vs Software Key Storage

| Dimension | HSM | Software (e.g., file, env var) |
|-----------|-----|-------------------------------|
| **Key extraction** | Impossible (tamper-proof) | Possible (memory dump, file access) |
| **Performance** | Hardware-accelerated crypto | CPU-bound |
| **Compliance** | FIPS 140-2 Level 3+ | FIPS 140-2 Level 1 at best |
| **Cost** | $$$$ ($5,000+ per unit, or cloud HSM) | Free |
| **Use case** | CA root keys, payment processing, PKI | Most application secrets |

### Cloud HSM Options

| Provider | Service | FIPS Level | Pricing Model |
|----------|---------|:----------:|---------------|
| **AWS** | CloudHSM | Level 3 | ~$1.50/hr per HSM |
| **AWS** | KMS (default) | Level 2 (multi-tenant) | Per-request |
| **Azure** | Dedicated HSM | Level 3 | Per-hour |
| **Azure** | Managed HSM | Level 3 | Per-hour |
| **GCP** | Cloud HSM | Level 3 | Per-key-version + per-operation |

:::warning
You rarely need a dedicated HSM unless you're in payments (PCI DSS), PKI (Certificate Authority), or government (FedRAMP High). For most use cases, a managed KMS (AWS KMS, Azure Key Vault, GCP KMS) provides sufficient security at a fraction of the cost.
:::

---

## 🔗 Related Chapters

- **[01 — Authentication & Authorization](./01-authentication-authorization.md)** — JWT signatures and token security
- **[02 — Web Vulnerabilities](./02-web-vulnerabilities.md)** — How TLS and hashing defend against attacks
- **[04 — Privacy & Compliance](./04-privacy-compliance.md)** — Encryption for data protection compliance
- **[05 — Interview Questions](./05-interview-questions.md)** — Practice cryptography design questions

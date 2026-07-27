# Privacy Vault and Backup

## Privacy principle

> Private by default. Shared by intention. Cloud protects life; it does not own or read life.

## Storage principle

| Layer | Responsibility |
|---|---|
| Waymark Vault | Logical source of truth for records |
| SQLite | Local/offline working copy |
| Local filesystem | Media files |
| Secure storage | Secrets, app lock keys |
| Encrypted export | Manual safe backup |
| Cloud storage later | Explicit sync/restore storage governed by the Vault contract |
| Family Vault later | Selected sharing |

## Privacy scopes

| Scope | Meaning |
|---|---|
| private | Default; user only |
| private_sensitive | Hidden/masked when locked; intimacy/family-sensitive data |
| family | Later selected sharing |

## Private-sensitive examples

| Data | Scope |
|---|---|
| Intimacy protected Mark | private_sensitive |
| Wife notes | private/private_sensitive depending content |
| Family memories | private by default |
| Child memories | private by default |
| Work notes | private |
| Expedition plans | private |
| Financial/trip budgets | private |

## App Lock

| Requirement | Meaning |
|---|---|
| Lock state | App can hide private data |
| Sensitive masking | Private-sensitive title/note/photo hidden |
| Unlock | SecureStore/native auth later |
| Locked Journal | Sensitive items masked or hidden |
| Locked Today | Sensitive details hidden |

## Backup direction

Manual local backup first, encrypted export second, explicit cloud sync/restore later.

```text
Create record locally
→ Export encrypted backup
→ Restore locally
→ Later: upload encrypted payload/blob to cloud
```

## Cloud rules

| Rule | Meaning |
|---|---|
| No plaintext diary in cloud | Encrypt before upload |
| No plaintext memory captions | Encrypt payload |
| Media encrypted later | Encrypted blobs |
| Cloud services are not independent truth | Turso and Google Drive are storage layers governed by the Waymark Vault |
| Sharing later only | Family Vault after privacy stable |

## Build order

| Phase | Feature |
|---|---|
| 1 | Privacy scopes in schema |
| 2 | Private-sensitive masking |
| 3 | App Lock |
| 4 | Local export |
| 5 | Encrypted export |
| 6 | Restore flow |
| 7 | Encrypted cloud backup |
| 8 | Family Vault |
| 9 | Selected sharing |

## Do not build early

| Avoid | Reason |
|---|---|
| Cloud-first app | Violates local-first daily runtime |
| Plaintext cloud backup | Privacy risk |
| Family sharing before vault | Unsafe |
| Analytics dashboard | Privacy risk |
| Complex SaaS roles | Not needed |

## Acceptance criteria

| Test | Expected |
|---|---|
| Create Mark | Defaults private |
| Create intimacy Mark | private_sensitive |
| App locked | Sensitive content masked |
| App unlocked | Sensitive content visible |
| Export backup | File created |
| Encrypted export later | Payload unreadable without key |

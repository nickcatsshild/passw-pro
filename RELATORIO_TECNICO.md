# Relatório Técnico: Vaultwarden (passw-pro)

## 1. Visão Geral

**Vaultwarden** é uma implementação alternativa do servidor Bitwarden, escrita em Rust. É um gerenciador de senhas self-hosted (auto-hospedado) que fornece armazenamento criptografado de senhas, notas, cartões, identidades, arquivos (Sends) e suporte a organizações. Compatível com todos os clientes oficiais Bitwarden (web, desktop, mobile, CLI).

- **Repositório original:** https://github.com/dani-garcia/vaultwarden
- **Licença:** AGPL-3.0-only
- **Versão:** 1.0.0
- **Linguagem:** Rust (edition 2024, rust-version 1.94.1)

---

## 2. Tech Stack

| Categoria | Tecnologias |
|---|---|
| **Linguagem** | Rust 2024 (edition), nightly toolchain |
| **Web Framework** | Rocket 0.5.1, Rocket WebSockets 0.1.1 |
| **ORM/DB** | Diesel 2.3.10, Diesel Migrations 2.3.2, Diesel-derive-newtype |
| **DB Suportados** | SQLite (bundled/system), MySQL, PostgreSQL (via `diesel::MultiConnection`) |
| **Autenticação** | JWT RS256 (jsonwebtoken), OpenSSL RSA 2048-bit |
| **Criptografia** | ring (PBKDF2, HMAC, SHA256, rand), subtle (constant-time), argon2 |
| **2FA/MFA** | TOTP (totp-lite), WebAuthn/FIDO2 (webauthn-rs), YubiKey (yubico_ng), Duo (iframe/OIDC), Email |
| **SSO** | OpenID Connect (openidconnect 4.0.1) com PKCE |
| **Push Notifications** | HTTPS push para relay Bitwarden (para clientes mobile) |
| **WebSockets** | Tempo real via SignalR-compatible WebSocket |
| **Templates** | Handlebars (handlebars 6.x) + SCSS (grass_compiler) |
| **Email** | Lettre 0.11 (SMTP, Sendmail) |
| **HTTP Client** | reqwest 0.13 (favicons, HIBP, Duo, push relay) |
| **Job Scheduler** | job_scheduler_ng 2.4.0 (cron-like) |
| **Cache** | dashmap (WebSocket sessions, favicons), moka (OIDC), cached (functions) |
| **Rate Limiting** | governor 0.10 (login + admin endpoints) |
| **Storage** | Apache OpenDAL 0.57 (filesystem, S3) |
| **Testes** | Playwright (e2e), testes integrados |
| **Build/Deploy** | Docker, GitHub Actions, multi-arquitetura (amd64, arm64, armv7, armv6) |
| **Linters** | Clippy (pedantic), rustfmt, pre-commit hooks |

---

## 3. Estrutura do Projeto

```
C:\GitHub\passw-pro\
├── Cargo.toml              # Manifesto Rust (workspace + dependências + perfis)
├── Cargo.lock              # Lockfile de dependências
├── build.rs                # Script de build (embute versão do web-vault)
├── diesel.toml             # Configuração Diesel CLI
├── Dockerfile              # → redireciona para docker/Dockerfile.debian
├── rust-toolchain.toml     # Pin da toolchain Rust
├── rustfmt.toml            # Config formatação
├── .env.template           # ~350 variáveis de ambiente documentadas
├── .github/                # CI/CD: GitHub Actions, templates, workflows
│
├── src/                    # CÓDIGO FONTE PRINCIPAL
│   ├── main.rs             # Entrypoint: init, args, pool, jobs, Rocket launch
│   ├── config.rs           # Sistema de configuração (~1826 linhas, macro make_config!)
│   ├── auth.rs             # JWT (RS256), geração de tokens, headers de autenticação
│   ├── crypto.rs           # Funções cripto: PBKDF2, HMAC, SHA256, IDs, tokens
│   ├── error.rs            # Sistema de erros com macro make_error
│   ├── util.rs             # Fairings (CORS, Headers, Logging), helpers
│   ├── mail.rs             # Serviço de email (SMTP/Sendmail) com templates
│   ├── ratelimit.rs        # Rate limiting (governor) para login e admin
│   ├── http_client.rs      # HTTP client custom (bloqueio IPs, proxy, DNS)
│   ├── storage.rs          # Integração OpenDAL (FS + S3)
│   ├── sso.rs              # Lógica OIDC/SSO (tokens, estados)
│   ├── sso_client.rs       # Cliente OIDC
│   │
│   ├── api/                # TODAS AS ROTAS DA API
│   │   ├── mod.rs          # Re-exports, tipos comuns, MasterPasswordPolicy
│   │   ├── web.rs          # Rotas Web: static files, index, CSS, attachments
│   │   ├── identity.rs     # /identity/connect/token (login OAuth2, refresh, SSO, API key)
│   │   ├── admin.rs        # Interface admin (usuários, config, diagnóstico)
│   │   ├── icons.rs        # Serviço de favicons (download, cache, external)
│   │   ├── notifications.rs# WebSocket hub (SignalR), notificações real-time
│   │   ├── push.rs         # Push notifications para relay Bitwarden
│   │   ├── core/           # Núcleo da API Bitwarden
│   │   │   ├── mod.rs      # Coleta de rotas, domains, HIBP
│   │   │   ├── accounts.rs # Prelogin, registro, KDF upgrade, perfil, email
│   │   │   ├── ciphers.rs  # CRUD de itens (senhas, notas, cartões, identidades)
│   │   │   ├── folders.rs  # Gerenciamento de pastas
│   │   │   ├── organizations.rs # Organizações, membros, grupos, collections
│   │   │   ├── sends.rs    # Bitwarden Sends (compartilhamento temporário)
│   │   │   ├── events.rs   # Log de eventos de auditoria
│   │   │   ├── emergency_access.rs # Acesso de emergência
│   │   │   ├── public.rs   # Rotas públicas (API info)
│   │   │   └── two_factor/ # Autenticação 2FA (TOTP, WebAuthn, Duo, YubiKey, Email)
│   │
│   ├── db/                 # CAMADA DE DADOS
│   │   ├── mod.rs          # Pool, conexão, migrações (SQLite/MySQL/PostgreSQL)
│   │   ├── schema.rs       # Schema Diesel (28 tabelas + joins)
│   │   ├── query_logger.rs # Logger de queries lentas
│   │   └── models/         # 20 models (User, Cipher, Organization, Send, etc.)
│   │
│   └── static/             # Assets estáticos (JS, CSS, templates, imagens)
│       ├── scripts/        # JS (jquery, datatables, jdenticon, admin)
│       ├── templates/      # Handlebars templates
│       │   ├── admin/      # Admin panel (base, login, users, settings, orgs, diagnostics)
│       │   ├── email/      # ~40 templates de email (welcome, 2FA, invite, etc.)
│       │   └── scss/       # SCSS stylesheets
│       └── images/         # Logo e ícones
│
├── migrations/             # Migrações Diesel (SQLite, MySQL, PostgreSQL)
├── macros/                 # Sub-crate de macros custom
├── docker/                 # Dockerfiles, healthcheck, scripts de build
├── playwright/             # Testes end-to-end
├── tools/                  # Scripts auxiliares
└── resources/              # Recursos (SVGs)
```

---

## 4. Arquitetura e Fluxo de Dados

### Arquitetura Geral

Vaultwarden segue uma **arquitetura monolítica modular** em Rust com:

1. **Rocket Web Framework** como servidor HTTP
2. **Diesel ORM** com suporte a múltiplos bancos via `diesel::MultiConnection`
3. **JWT RS256** para autenticação stateless
4. **WebSockets** para notificações em tempo real
5. **Job Scheduler** para tarefas agendadas em background
6. **OpenDAL** para abstração de armazenamento (local FS ou S3)

### Fluxo de Inicialização (main.rs)

```
main()
├── install_rustls_crypto_provider()  → Configura ring como crypto provider
├── parse_args()                       → Admin token hash, backup, --version
├── init_logging()                     → Configura fern logging (stdout + file + syslog)
├── check_data_folder()                → Verifica persistência Docker
├── auth::initialize_keys()            → Gera/carrega RSA 2048-bit keypair
├── check_web_vault()                  → Verifica existência do web-vault
├── create_dir()                       → Cria tmp folder
├── create_db_pool()                   → Conecta ao DB, executa migrações
├── schedule_jobs()                    → Inicia thread de job scheduler
├── migrate_u2f_to_webauthn()         → Migração legacy
├── migrate_credential_to_passkey()    → Migração passkey
└── launch_rocket()                    → Monta rotas, registra catchers, inicia servidor
```

### Fluxo de Requisição

```
Cliente (Web/Mobile/Desktop)
    ↓
Rocket Router (basepath + mount points)
    ├── / → web_routes (static files, web vault)
    ├── /api → core_routes (accounts, ciphers, folders, orgs, sends, etc.)
    ├── /identity → identity_routes (login OAuth2)
    ├── /admin → admin_routes (painel admin)
    ├── /events → core_events_routes
    ├── /icons → icons_routes (favicons)
    └── /notifications → notifications_routes (WebSocket)
    ↓
Fairings: AppHeaders, CORS, BetterLogging
    ↓
Auth Guard: Headers (valida JWT Bearer, extrai usuário/dispositivo)
    ↓
Rate Limiter: IP-based (login e admin)
    ↓
Handler Function → DbConn (pool), lógica de negócio
    ↓
Resposta JSON (ou HTML para admin/web)
```

---

## 5. Schema do Banco de Dados (28 tabelas)

| Tabela | Descrição |
|---|---|
| **users** | Usuários: email, password_hash, salt, akey (chave de criptografia), KDF params, 2FA, API key |
| **ciphers** | Itens do cofre: senhas, notas, cartões, identidades (campo `data` com JSON criptografado) |
| **attachments** | Anexos de ciphers (armazenamento local/S3) |
| **folders** | Pastas organizacionais |
| **folders_ciphers** | Relação N:N cipher ↔ folder |
| **favorites** | Favoritos por usuário |
| **collections** | Coleções de organização |
| **collections_groups** | Permissões collection ↔ group |
| **ciphers_collections** | Relação cipher ↔ collection |
| **organizations** | Organizações |
| **users_organizations** | Membros de organização (tipo, status, chave reset) |
| **organization_api_key** | API keys de organização |
| **groups** | Grupos dentro de organização |
| **groups_users** | Membros de grupos |
| **sends** | Bitwarden Sends (compartilhamento temporário) |
| **devices** | Dispositivos registrados (push tokens, refresh tokens) |
| **twofactor** | Configurações 2FA por usuário (TOTP, WebAuthn, Duo, YubiKey, Email) |
| **twofactor_incomplete** | Logins 2FA incompletos (detecção de comprometimento) |
| **twofactor_duo_ctx** | Contextos de autenticação Duo OIDC |
| **auth_requests** | Requisições de autenticação (login device approval) |
| **event** | Log de auditoria (eventos de usuários e organizações) |
| **emergency_access** | Acesso de emergência |
| **invitations** | Invitations para registro |
| **org_policies** | Políticas de organização (MasterPassword, etc.) |
| **sends** | Sends |
| **sso_auth** | Estados de autenticação SSO (incomplete flows) |
| **sso_users** | Vinculação SSO user ↔ identifier |
| **archives** | Itens arquivados |

**Campo `data` em ciphers/sends**: Todo conteúdo sensível é armazenado como JSON criptografado no **client-side**. O servidor nunca tem acesso ao plaintext. A criptografia é feita via **Bitwarden protocol** usando a master key do usuário.

---

## 6. API Endpoints

### Identity (OAuth2) - `/identity`
| Método | Rota | Descrição |
|---|---|---|
| POST | `/connect/token` | Login (password, refresh_token, client_credentials, authorization_code, send_access) |
| POST | `/accounts/prelogin` | Prelogin (KDF parameters) |
| POST | `/accounts/register` | Registro de novo usuário |

### Core API - `/api`
| Módulo | Rotas | Descrição |
|---|---|---|
| **accounts** | `GET/POST/PUT /accounts/*` | Prelogin, register, profile, keys, email, password, KDF upgrade, API key, security stamp, delete account, verify email |
| **ciphers** | `GET/POST/PUT/DELETE /ciphers/*` | CRUD de ciphers, sync, import, attachment management, share, purge trash |
| **folders** | `GET/POST/PUT/DELETE /folders/*` | CRUD de pastas |
| **organizations** | `GET/POST/PUT/DELETE /organizations/*` | CRUD orgs, membros, collections, groups, policies, import, export, bulk, keys, API keys, SSO, domain verification, sponsored subscriptions, org user revocation |
| **sends** | `GET/POST/PUT/DELETE /sends/*` | CRUD Sends, acesso por access token |
| **emergency_access** | `GET/POST/PUT/DELETE /emergency-access/*` | Convite, confirmação, recuperação, timeout, notificações |
| **two_factor** | `GET/POST/PUT /two-factor/*` | TOTP, WebAuthn, Duo (legacy + OIDC), YubiKey, Email 2FA, recovery codes, remember |
| **events** | `GET /events/*` | Log de eventos de organização |
| **public** | `GET /public/settings`, `POST /public/register` | Configurações públicas, registro público |
| **meta** | `GET /alive`, `GET /now`, `GET /version`, `GET /config` | Health check, timestamp, versão, feature flags |

### Web - `/`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/` | Web vault index |
| GET | `/*` | Static files (web vault) |
| GET | `/app-id.json` | App ID |
| GET | `/apple-app-site-association` | Universal links iOS |
| GET | `/attachments/{id}` | Download de attachment |
| GET | `/css/vaultwarden.css` | CSS dinâmico via SCSS |

### Admin - `/admin`
| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/admin/login` | Login admin |
| GET | `/admin/` | Dashboard |
| GET/DELETE | `/admin/users/` | Gerenciamento de usuários |
| GET/POST | `/admin/settings` | Configurações |
| GET | `/admin/diagnostics` | Diagnóstico |

### Icons - `/icons`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/icons/{domain}/icon.png` | Favicon (internal ou redirect) |

### Notifications - `/notifications`
| Método | Rota | Descrição |
|---|---|---|
| GET | `/notifications/hub` | WebSocket (SignalR) |
| GET | `/notifications/anonymous-hub` | WebSocket anônimo |

---

## 7. Autenticação e Autorização

### JWT RS256
- **Algoritmo:** RS256 (RSA 2048-bit)
- **Multiplos issuers:** login, invite, emergency access, delete, verify email, admin, send, org API key, file download, register verify, 2FA remember
- **Tokens:** Access token (2h), Refresh token (30-90 dias)
- **Payload:** `{ sub: user_uuid, exp, iat, iss, client_id, scope, amr (2FA methods), sst (security stamp), device }`

### Tipos de Login
| Grant Type | Descrição |
|---|---|
| `password` | Email + master password (com 2FA) |
| `refresh_token` | Renovação de sessão |
| `client_credentials` | API key (usuário ou organização) |
| `authorization_code` | SSO OIDC |
| `send_access` | Acesso anônimo a Send |

### 2FA/MFA (6 métodos)
1. **TOTP** (Google Authenticator, etc.)
2. **WebAuthn** (FIDO2/Passkeys)
3. **Duo** (legacy iframe + OIDC Universal Prompt)
4. **YubiKey** (OTP via yubico_ng)
5. **Email** (código numérico)
6. **2FA Remember** (cookie JWT)

### SSO (OpenID Connect)
- Descoberta automática via `/.well-known/openid-configuration`
- PKCE (Proof Key for Code Exchange)
- Suporte a múltiplos scopes
- Policy de master password via SSO
- Modo `SSO_ONLY` (desabilita login por senha)
- Cache do discovery endpoint

### Admin
- Autenticação via `ADMIN_TOKEN` (Argon2id PHC string)
- Sessão JWT admin (20 min lifetime)
- Rate limiting por IP
- Opção `DISABLE_ADMIN_TOKEN=true` para proxy reverso

---

## 8. Lógica de Negócio

### Criptografia Fim-a-Fim
- O servidor **nunca** tem acesso às senhas/notas do usuário
- Tudo é criptografado no cliente usando a **master key** derivada do master password via PBKDF2/Argon2id
- O `data` field em ciphers contém JSON criptografado
- `akey` (chave de criptografia assimétrica) é armazenada encriptada com a master key

### KDF (Key Derivation Function)
- Suporte a PBKDF2 (SHA-256, iterável) e Argon2id
- Parâmetros: type, iterations, memory, parallelism
- Default: 600k iterations PBKDF2
- Upgrade automático durante login

### Job Scheduler (cron-like)
| Job | Função |
|---|---|
| `SEND_PURGE_SCHEDULE` | Remove sends expirados |
| `TRASH_PURGE_SCHEDULE` | Deleta itens na lixeira permanentemente |
| `INCOMPLETE_2FA_SCHEDULE` | Notifica logins 2FA incompletos |
| `EMERGENCY_REQUEST_TIMEOUT_SCHEDULE` | Concede acesso de emergência |
| `EMERGENCY_NOTIFICATION_REMINDER_SCHEDULE` | Lembretes de acesso emergencial |
| `EVENT_CLEANUP_SCHEDULE` | Limpa eventos antigos |
| `AUTH_REQUEST_PURGE_SCHEDULE` | Limpa auth requests expirados |
| `DUO_CONTEXT_PURGE_SCHEDULE` | Limpa contextos Duo expirados |
| `PURGE_INCOMPLETE_SSO_AUTH` | Limpa SSO incompletos |

### Favicon Service
- Serviço interno: download via HTTP com parsing HTML para extrair ícone
- Cache em disco (TTL configurável)
- Bloqueio de IPs não-globais e domínios por regex
- Serviço externo: redirect para DuckDuckGo, Google, Bitwarden, ou custom URL

### Push Notifications
- Enviadas para relay Bitwarden (push.bitwarden.com)
- Suporte mobile: cipher updates, folder updates, logout, user updates, auth requests
- Token JWT de autenticação com installation ID/key

### WebSockets (SignalR)
- Tempo real para sincronização entre dispositivos
- Atualizações: ciphers, folders, sends, user settings, auth requests
- Conexões anônimas para Sends e auth requests

### Storage (OpenDAL)
- Abstração: local filesystem ou S3 (feature `s3`)
- Suporte a AWS SSO credentials
- Pastas configuráveis: data, attachments, sends, icon_cache, rsa_key, tmp

---

## 9. Configuração

### Fontes (em ordem de precedência)
1. Variáveis de ambiente
2. Arquivo `.env` (carregado via dotenvy)
3. `config.json` na DATA_FOLDER (sobrescreve via admin)
4. Valores padrão

### ~350 variáveis de ambiente
Agrupadas em seções:
- **Data folders**: DATA_FOLDER, ATTACHMENTS_FOLDER, SENDS_FOLDER, ICON_CACHE_FOLDER
- **Database**: DATABASE_URL (sqlite/mysql/postgresql), pool settings, WAL
- **WebSocket**: ENABLE_WEBSOCKET
- **Push**: PUSH_ENABLED, installation key/id
- **General**: DOMAIN, SIGNUPS_ALLOWED, signups verify/whitelist, org events, emergency access, invites, password iterations, sends, HIBP, trash auto-delete, attachment limits
- **Advanced**: IP_HEADER, ICON_SERVICE, icon cache, block regex, feature flags, rate limiting, groups, SSO, note size limit
- **SSO**: OIDC authority, client id/secret, PKCE, scopes, master password policy
- **MFA**: Yubico, Duo, email 2FA (token size, expiration, attempts), authenticator time drift
- **SMTP**: host, from, security (starttls/force_tls/off), auth mechanisms, sendmail
- **Admin**: ADMIN_TOKEN (Argon2id), rate limiting, session lifetime
- **Rocket**: address, port, TLS

### Config persistente
Admin salva alterações em `{DATA_FOLDER}/config.json`
- Lido via OpenDAL
- Aplicado via `ConfigBuilder` com merge sobre env vars

---

## 10. Testes

### Playwright (E2E)
- Localizados em `playwright/`
- Testes de interface web
- CI integrado ao GitHub Actions

---

## 11. Build e Deploy

### Docker Multi-Arquitetura
- **Dockerfile**: `docker/Dockerfile.debian` (padrão) e `docker/Dockerfile.alpine`
- **Arquiteturas**: amd64, arm64, armv7, armv6
- **Registries**: Docker Hub (`vaultwarden/server`), Quay.io, GitHub Container Registry
- **Healthcheck**: Script `docker/healthcheck.sh`
- **Bake**: `docker/docker-bake.hcl` + `docker/bake.sh` para build matrix

### Perfis de Compilação (Cargo.toml)
| Perfil | Uso |
|---|---|
| `release` | Production (strip debug, LTO fat, 1 codegen unit) |
| `release-micro` | Otimizado para tamanho (opt-level=z, abort panic) |
| `release-low` | Baixo consumo de recursos (thin LTO, 16 codegen) |
| `ci` | CI builds (debug assertions off, strip symbols) |
| `dbg` | Debug/Profiling (full debug info, sem strip) |

### CI/CD (GitHub Actions)
- Build multi-plataforma (Linux, Windows, macOS)
- Testes de migração (SQLite, MySQL, PostgreSQL)
- Lint (clippy, rustfmt)
- Security audit (cargo audit, trivy)
- Docker build e push multi-arquitetura

---

## 12. Arquivos-Chave e Seus Propósitos

| Arquivo | Propósito |
|---|---|
| `src/main.rs` | Entrypoint, inicialização, Rocket launch, jobs, signals |
| `src/config.rs` | ~1826 linhas: macro `make_config!`, Config struct, ~350 vars, ambiente, env file, admin overrides, rocket config, validação |
| `src/auth.rs` | ~1315 linhas: JWT RS256 (encode/decode/validate), headers de autenticação, admin auth, send tokens, file download tokens, 2FA remember, device headers, client IP/version, stamp exception check |
| `src/crypto.rs` | PBKDF2, HMAC, SHA256, constant-time compare, random bytes/strings/IDs, API keys, email tokens |
| `src/error.rs` | ~436 linhas: Error enum com `make_error!` macro, HTTP status codes, serialização JSON de erros, eventos de auditoria |
| `src/mail.rs` | ~733 linhas: SMTP/Sendmail, templates Handlebars, verify email, welcome, 2FA, invitations, emergency access, password hints, delete account, admin reset password, SSO email change, inline images |
| `src/util.rs` | ~949 linhas: Fairings (AppHeaders, CORS, BetterLogging), caching wrapper, formatadores data, helpers container/runtime, feature flag parsing, ID e data utils |
| `src/db/mod.rs` | Pool multi-DB, conexão, migrações automáticas, backup SQLite, `db_run!` macro |
| `src/db/schema.rs` | Schema Diesel (28 tabelas), joins, `allow_tables_to_appear_in_same_query!` |
| `src/api/identity.rs` | ~1322 linhas: Login OAuth2 (password, refresh_token, client_credentials, authorization_code, send_access), pré-validação, registro, SSO callback |
| `src/api/notifications.rs` | ~657 linhas: WebSocket hub, user/anonymous subscriptions, DashMap de conexões, MessagePack encoding, auth request notifications |
| `src/api/icons.rs` | ~842 linhas: Download favicons com parsing HTML, cache, bloqueio de IPs, SVG sanitization |
| `src/api/admin.rs` | ~896 linhas: Painel admin (CRUD usuários, invites, configurações, diagnóstico), templates Handlebars |
| `src/api/push.rs` | ~336 linhas: Push notifications via Bitwarden relay, auth token caching, cipher/folder/send/user updates |
| `src/api/core/accounts.rs` | Prelogin, register, profile, email change, password change, KDF upgrade, API key, security stamp, delete account, verify email, device management, auth requests |
| `src/api/core/ciphers.rs` | CRUD ciphers, sync, import, attachment management, share, bulk actions, trash, purge |
| `src/api/core/organizations.rs` | CRUD orgs, members, collections, groups, policies, import, export, domain verification, SSO config |
| `src/api/core/two_factor/` | Authenticator (TOTP), Duo (legacy + OIDC), WebAuthn, YubiKey, Email 2FA, recovery codes, protected actions |
| `src/sso.rs` | OIDC state management, PKCE, token verification, master password policy |
| `src/sso_client.rs` | Cliente OIDC integration |
| `src/ratelimit.rs` | Rate limiting (governor) para login e admin endpoints |
| `src/http_client.rs` | HTTP client custom com bloqueio de IPs não-globais, regex de domínios, proxy SOCKS, hickory DNS resolver |
| `src/storage.rs` | OpenDAL abstraction (read/write/copy/move/delete/scan) para FS e S3 |
| `docker/Dockerfile.debian` | Dockerfile base Debian multi-stage |
| `docker/Dockerfile.alpine` | Dockerfile Alpine (menor tamanho) |
| `docker/healthcheck.sh` | Script de healthcheck |
| `docker/start.sh` | Entrypoint script |

---

## 13. Compatibilidade Bitwarden

Vaultwarden implementa a API Bitwarden com as seguintes capacidades:
- Todos os tipos de item (login, card, identity, secure note)
- Organizações com coleções, grupos, políticas
- Bitwarden Sends (texto + arquivo)
- Acesso de emergência
- Log de eventos de auditoria
- SSO via OpenID Connect
- 2FA (TOTP, WebAuthn, Duo, YubiKey, Email)
- Push notifications
- Sincronização WebSocket em tempo real
- Importação/exportação
- API keys para automação

**Não implementado** (Bitwarden premium features):
- Relatórios de segurança (HIBP é implementado, mas não os reports)
- Bitwarden Authenticator (TOTP generator integrado)

---

## 14. Relações entre módulos (para compreensão de IA)

```
main.rs
  ├── config.rs        ← Lido primeiro (CONFIG global LazyLock)
  ├── auth.rs          ← Usado por: identity.rs, admin.rs, api/core/*
  ├── crypto.rs        ← Usado por: auth.rs, api/core/accounts.rs, api/core/two_factor/*
  ├── error.rs         ← Usado por: TODO MÓDULO
  ├── util.rs          ← Fairings globais: AppHeaders (security headers), CORS, BetterLogging
  ├── mail.rs          ← Usado por: api/core/accounts.rs, admin.rs, api/core/two_factor/*
  ├── ratelimit.rs     ← Usado por: identity.rs, admin.rs
  ├── storage.rs       ← Usado por: config.rs (OpenDAL ops), api/web.rs (attachments)
  ├── sso.rs           ← Usado por: identity.rs, api/core/organizations.rs
  ├── sso_client.rs    ← Usado por: identity.rs (SSO login)
  │
  ├── api/identity.rs  → auth::*, crypto::*, sso::*, api/core/two_factor/*
  ├── api/web.rs       → auth::* (file download), util::* (caching)
  ├── api/admin.rs     → auth::*, db/models/*, mail::*, sso::*
  ├── api/icons.rs     → http_client::*, config::PathType, storage::*
  ├── api/notifications.rs → auth::*, db/models/*, api/push::*
  ├── api/push.rs      → http_client::*, db/models/*
  │
  └── api/core/
      ├── accounts.rs      → auth::*, crypto::*, mail::*, api/core/two_factor/*
      ├── ciphers.rs       → auth::*, db/models/*
      ├── folders.rs       → auth::*, db/models/*
      ├── organizations.rs → auth::*, mail::*, db/models/*, sso::*
      ├── sends.rs         → auth::*, db/models/*
      ├── events.rs        → auth::*, db/models/*
      ├── emergency_access.rs → auth::*, mail::*, db/models/*
      └── two_factor/      → auth::*, crypto::*, mail::*, http_client::*
```

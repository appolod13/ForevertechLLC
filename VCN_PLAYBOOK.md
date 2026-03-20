## Oracle VCN / Connectivity Playbook (ForeverTeck)

### When to Use
Use this when production behavior differs from local due to timeouts, 502/504, missing websockets/SSE, or inconsistent caching/headers that suggest edge/origin routing problems.

### Fast Triage (Instance)
- Confirm the instance is reachable:
  - `ssh ubuntu@<public-ip>`
  - `sudo systemctl status docker` (if using docker compose)
  - `docker compose ps` in `traefik-enterprise`
- Confirm listeners:
  - `sudo ss -lntp | egrep ':(80|443)\\b'`
- Confirm origin health:
  - `curl -I http://127.0.0.1:3001/api/health`
  - `curl -I http://127.0.0.1:3001/studio`

### VCN Checklist (Console)
**VCN**
- CIDR does not overlap with client/internal networks.

**Subnets**
- Public subnet: route table has `0.0.0.0/0 -> Internet Gateway`.
- Private subnet: route table has `0.0.0.0/0 -> NAT Gateway` (if outbound needed).

**Security Lists / NSGs**
- Ingress allow:
  - TCP 443 from `0.0.0.0/0` to instance/LB
  - TCP 80 from `0.0.0.0/0` (optional, for HTTP->HTTPS redirects)
- Egress allow:
  - TCP 443 to `0.0.0.0/0` (required for API providers, package pulls)
- If using websockets/SSE:
  - Ensure no proxy timeouts too low at LB/CDN.

**Load Balancer (if used)**
- Backend set health checks hit a real endpoint:
  - `/api/health` for catalog
- SSL policy matches modern browsers; certificates valid; SNI correct.

**DNS**
- `foreverteck.com` points to Cloudflare, which points to your origin/LB.
- Verify A/AAAA records and proxy status; ensure no stale record sets.

### Zero-Downtime VCN Reconstruction Plan (Template)
1) Export current networking config:
   - Screenshot / export route tables, security lists, NSGs, subnets, gateways, LB config, DNS.
2) Create parallel VCN:
   - Choose a corrected CIDR (avoid overlaps).
   - Recreate public/private subnets with correct route tables and gateways.
3) Migrate compute:
   - Create a custom image from existing instance.
   - Launch a new instance in the new VCN using the custom image.
4) Update deployment overlays:
   - Update docker compose `.env` to new internal IPs if needed.
   - Ensure any `host.docker.internal` usage is compatible (Linux needs `extra_hosts` which is already configured).
5) Validate service discovery:
   - DNS resolution inside instance/container.
   - Outbound access to API providers (443).
6) Run smoke tests:
   - `./traefik-enterprise/scripts/deploy/smoke.sh`
   - Verify `/studio`, `/api/health`, SSE endpoints, and image generator endpoints.
7) Cutover:
   - Use weighted DNS or Cloudflare load balancing to shift 5% traffic.
   - Monitor error rates/latency; rollback by shifting weight back.


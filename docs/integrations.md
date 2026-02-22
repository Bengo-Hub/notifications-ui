# Integrations Guide

## Centralized SSO
The Notifications UI integrates with the Codevertex SSO platform via the PKCE (Proof Key for Code Exchange) flow.
- **Callback**: `/[orgSlug]/auth/callback`
- **Scopes**: `openid profile email notifications:admin`

## Notifications API
Backend communication is facilitated through a typed Axios client with organization-scoping headers.
- **Base URL**: Configurable via `NEXT_PUBLIC_API_BASE_URL`.
- **Primary Modules**:
    - `templatesApi`: CRUD operations for notification templates.
    - `settingsApi`: Provider and branding configurations.
    - `analyticsApi`: Delivery rates and activity logs.

## Channel Providers
Supported providers include:
- **Email**: SMTP (Direct) or SendGrid (API).
- **SMS**: Twilio (API).
- **Push**: Firebase Cloud Messaging (FCM) or custom WebPush via NATS.

## Multi-tenant Resolution
The UI resolves tenant identity through:
1.  **URL Segment**: The primary identifier (`/[orgSlug]`).
2.  **Auth Claims**: Verified against the JWT `org_id` claim during privileged operations.
3.  **Branding Provider**: Fetches visual metadata based on the resolved slug.

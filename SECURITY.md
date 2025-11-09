# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `main`  | ✅ |
| Latest release | ✅ |

## Reporting a Vulnerability

Email [security@bengobox.com](mailto:security@bengobox.com) with subject `SECURITY: Notifications Service`. Include:

- Description and potential impact
- Steps to reproduce (proof of concept preferred)
- Affected commit/version
- Suggested remediation (if known)

We acknowledge reports within 48 hours and provide an initial response within 5 business days.

## Responsible Disclosure

- Do not publicly disclose vulnerabilities before a fix is released
- Avoid testing that degrades availability or integrity
- Do not access or modify data that is not yours

## Patch Process

1. Triage and severity assessment
2. Fix developed on private branch, reviewed by security team
3. Deploy via CI/CD and ArgoCD
4. Publish advisory in [`CHANGELOG.md`](CHANGELOG.md) and internal communications

Thank you for helping keep our users safe.

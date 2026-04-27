# Contributing to CC Dashboard

Thank you for your interest in contributing. This document describes the contribution process and the Contributor License Agreement (CLA) you must accept before your pull request can be merged.

---

## Contributor License Agreement

Before contributing, please read and agree to the following Individual Contributor License Agreement. By opening a pull request and including the sign-off line described below, you confirm that you have read and agree to its terms.

---

### Individual Contributor License Agreement

**Version 1.0**

This Contributor License Agreement ("Agreement") is entered into between **SadeghRahnamoon** ("Project Owner") and the individual submitting contributions to the CC Dashboard project ("Contributor").

**1. Definitions**

- "Contribution" means any original work of authorship, including modifications or additions to existing work, submitted by the Contributor to the project via pull request or other means.
- "Project" means the CC Dashboard software and all associated files hosted in this repository.

**2. Grant of Copyright License**

Subject to the terms of this Agreement, the Contributor grants to the Project Owner a perpetual, worldwide, non-exclusive, royalty-free, irrevocable copyright license to reproduce, prepare derivative works of, publicly display, publicly perform, sublicense, and distribute the Contribution and such derivative works in any form.

**3. Grant of Patent License**

Subject to the terms of this Agreement, the Contributor grants to the Project Owner a perpetual, worldwide, non-exclusive, royalty-free, irrevocable patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Contribution, where such license applies only to patent claims licensable by the Contributor that are necessarily infringed by the Contribution alone or by the combination of the Contribution with the Project.

**4. Contributor Representations**

The Contributor represents that:

(a) Each Contribution is the Contributor's original creation and the Contributor has the legal right to grant the licenses above.

(b) The Contribution does not knowingly infringe any third-party intellectual property rights.

(c) If the Contributor is submitting work on behalf of an employer or organization, the Contributor has obtained the necessary rights and permissions to do so.

**5. Disclaimer**

The Contribution is provided "as is" without warranty of any kind, express or implied.

**6. License of the Project**

The Contributor understands that the Project is licensed under the MIT License and that the Project Owner reserves the right to change the license of the Project (including any Contributions) in the future.

---

## How to Agree

Include the following line verbatim in your pull request description:

> I have read the Contributor License Agreement in CONTRIBUTING.md and I agree to its terms.

You only need to do this once. Subsequent pull requests from the same GitHub account are covered by your initial agreement.

---

## Contribution Guidelines

### Branching

- `main` is a protected branch. All changes must go through a pull request.
- Create your feature or fix branch from the latest `main`:
  ```bash
  git checkout main && git pull
  git checkout -b your-feature-name
  ```

### Development Setup

See the [Local Development](README.md#local-development) section of the README.

### Tests

- Add or update unit tests for any logic changes in `__tests__/unit/`.
- Add or update integration tests for any database or API changes in `__tests__/integration/`.
- All tests must pass before a PR will be reviewed:
  ```bash
  npm test                  # Unit tests
  npm run test:integration  # Integration tests (requires Docker)
  ```

### Code Style

- Run `npm run lint` before pushing and resolve all errors.
- Follow the existing patterns in the codebase — raw SQL, no ORM, TypeScript interfaces in `types/index.ts`.

### Pull Request Checklist

Before submitting:

- [ ] Tests pass (`npm test` and `npm run test:integration` if applicable)
- [ ] Linting passes (`npm run lint`)
- [ ] The CLA agreement line is included in the PR description
- [ ] The PR description explains *what* changed and *why*

---

## Code of Conduct

This is a personal project. Contributions are welcome, but the bar for acceptance is the Project Owner's discretion. Please be respectful and constructive in all interactions. Pull requests may be closed without explanation.

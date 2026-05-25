# Next steps

Remaining work to close rubric gaps and harden the project.

## Checklist

1. **Replace root `README.md`** with a real project README: what Endetted is, how to run locally, team members, and a short **Testing** section (see item 4).
2. **Add 2 Mermaid architecture diagrams** in that README (client → Express API → Firestore), consistent with the actual codebase.
3. **Add `checkMembership` on expense delete** (`DELETE /api/groups/:id/expenses/:expenseId`) and add **one E2E test** that a non-member gets **403**.
4. **Document security**: either add Firestore security rules, or state clearly that the app is **API-only** (no direct client Firestore writes; all data goes through Express + JWT).
5. **Add `.env.example`** (e.g. `VITE_API_URL`) and document env vars in the project README.
6. **Testing section in README**: point readers to `npm test` (runs frontend Vitest + backend Jest E2E suites).

## Already done

- 2+ automated E2E tests (backend API flows + frontend balance pipeline)
- `npm test` at repo root and `make test`

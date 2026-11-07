import assert from "node:assert/strict";
import test from "node:test";
import { isIsolatedDevelopmentDatabase } from "../utils/databaseSafety.js";

test("database write guard accepts only the isolated CrimeMap development database", () => {
  assert.equal(isIsolatedDevelopmentDatabase({ host: "127.0.0.1", database: "crimemap_admin_dev" }), true);
  assert.equal(isIsolatedDevelopmentDatabase({ host: "localhost", database: "crimemap_admin_dev" }), false);
  assert.equal(isIsolatedDevelopmentDatabase({ host: "127.0.0.1", database: "postgres" }), false);
  assert.equal(isIsolatedDevelopmentDatabase({ host: "aws-0.example.pooler.supabase.com", database: "crimemap_admin_dev" }), false);
  assert.equal(isIsolatedDevelopmentDatabase(null), false);
});

import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import jwt from "jsonwebtoken";
import { after, before, test } from "node:test";
import { Op } from "sequelize";
import app from "../app.js";
import { sequelize, User, CrimeReport } from "../models/index.js";
import { uploadDirectory } from "../middleware/reportUpload.js";
import { isIsolatedDevelopmentDatabase } from "../utils/databaseSafety.js";

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const reporterEmail = `milestone4-reporter-${suffix}@example.test`;
const secondEmail = `milestone4-second-${suffix}@example.test`;
const adminEmail = `milestone4-admin-${suffix}@example.test`;
const testPasswords = Object.fromEntries(
  ["reporter", "second", "admin"].map((key) => [key, randomBytes(24).toString("base64url")]),
);

let httpServer;
let baseUrl;
const createdUserIds = new Set();
const createdEvidenceFiles = new Set();

before(async () => {
  if (!isIsolatedDevelopmentDatabase(sequelize?.config)) {
    throw new Error("Integration tests only write to 127.0.0.1/crimemap_admin_dev; set ENV_FILE to the isolated local environment.");
  }
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be configured for integration tests");
  await sequelize.authenticate();
  httpServer = app.listen(0);
  await new Promise((resolve, reject) => {
    httpServer.once("listening", resolve);
    httpServer.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${httpServer.address().port}`;

  const passwordHash = await bcrypt.hash(testPasswords.admin, 4);
  const admin = await User.create({
    name: "Milestone 4 Synthetic Administrator",
    email: adminEmail,
    passwordHash,
    role: "admin",
    adminRole: "Test Administrator",
    organization: "Synthetic Integration Tests",
  });
  createdUserIds.add(admin.id);
});

after(async () => {
  if (httpServer?.listening) {
    await new Promise((resolve) => httpServer.close(resolve));
  }
  for (const filePath of createdEvidenceFiles) await unlink(filePath).catch(() => {});
  if (createdUserIds.size) {
    const ids = [...createdUserIds];
    await CrimeReport.destroy({
      where: {
        [Op.or]: [
          { userId: { [Op.in]: ids } },
          { reviewedByUserId: { [Op.in]: ids } },
        ],
      },
    });
    await User.destroy({ where: { id: { [Op.in]: ids } } });
  }
  await sequelize.close();
});

async function call(method, route, { token, body } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

async function callMultipart(route, token, form) {
  const response = await fetch(`${baseUrl}${route}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    body: form,
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

async function uploadFileNames() {
  try {
    return new Set(await readdir(uploadDirectory));
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
}

test("Milestone 4 auth, authorization, report workflow, privacy, and persistence", async (t) => {
  let reporter;
  let second;
  let adminToken;
  let firstReportId;
  let rejectedReportId;
  let deletableReportId;

  await t.test("registration, duplicate prevention, password hashing, and login", async () => {
    const missingToken = await call("GET", "/api/auth/me");
    assert.equal(missingToken.status, 401);
    const missingProtectedToken = await call("GET", "/api/reports/mine");
    assert.equal(missingProtectedToken.status, 401);

    const invalidToken = await call("GET", "/api/auth/me", { token: "not-a-valid-jwt" });
    assert.equal(invalidToken.status, 401);

    const registered = await call("POST", "/api/auth/register", {
      body: { name: "Milestone Reporter", email: reporterEmail.toUpperCase(), password: testPasswords.reporter, role: "admin" },
    });
    assert.equal(registered.status, 201);
    assert.equal(registered.payload.data.user.role, "user");
    assert.equal(registered.payload.data.user.email, reporterEmail);
    assert.equal("passwordHash" in registered.payload.data.user, false);
    reporter = registered.payload.data.user;
    createdUserIds.add(reporter.id);

    const stored = await User.scope("withPasswordHash").findByPk(reporter.id);
    assert.ok(stored.passwordHash.startsWith("$2"));
    assert.notEqual(stored.passwordHash, testPasswords.reporter, "plaintext password must not be stored");

    const duplicate = await call("POST", "/api/auth/register", {
      body: { name: "Duplicate", email: ` ${reporterEmail.toUpperCase()} `, password: testPasswords.reporter },
    });
    assert.equal(duplicate.status, 409);

    const wrongPassword = await call("POST", "/api/auth/login", {
      body: { email: reporterEmail, password: "WrongPassword!123" },
    });
    assert.equal(wrongPassword.status, 401);

    const login = await call("POST", "/api/auth/login", {
      body: { email: reporterEmail.toUpperCase(), password: testPasswords.reporter },
    });
    assert.equal(login.status, 200);
    reporter.token = login.payload.data.token;

    const profile = await call("GET", "/api/auth/me", { token: reporter.token });
    assert.equal(profile.status, 200);
    assert.equal(profile.payload.data.user.id, reporter.id);
    assert.equal("passwordHash" in profile.payload.data.user, false);

    const adminRegistration = await call("POST", "/api/register-admin", {
      body: { name: "Self Admin", email: `self-admin-${suffix}@example.test`, password: testPasswords.reporter },
    });
    assert.equal(adminRegistration.status, 403);

    const invalidRoleClaim = jwt.sign({ sub: reporter.id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const deniedByDatabaseRole = await call("GET", "/api/complaints?include_rejected=true", { token: invalidRoleClaim });
    assert.equal(deniedByDatabaseRole.status, 403);
  });

  await t.test("user ownership, CRUD, and privacy", async () => {
    const secondRegister = await call("POST", "/api/register-user", {
      body: { name: "Second Synthetic Reporter", email: secondEmail, password: testPasswords.second },
    });
    assert.equal(secondRegister.status, 201);
    second = secondRegister.payload.data.user;
    second.token = secondRegister.payload.data.token;
    createdUserIds.add(second.id);

    const created = await call("POST", "/api/reports", {
      token: reporter.token,
      body: {
        category: "Theft",
        description: "Private synthetic report description",
        location: "Synthetic District, Demo State",
        state: "Demo State",
        district: "Synthetic District",
        latitude: 19.076,
        longitude: 72.8777,
        shareDescription: false,
      },
    });
    assert.equal(created.status, 201);
    firstReportId = created.payload.report.id;
    assert.equal(created.payload.report.status, "UNVERIFIED");
    assert.equal(created.payload.report.reporter_id, reporter.id);

    const noLongerPublicDescription = await call("GET", "/api/reports");
    const publicRow = noLongerPublicDescription.payload.reports.find((row) => row.id === firstReportId);
    assert.ok(publicRow);
    assert.equal(publicRow.description, null);
    assert.equal("email" in publicRow, false);
    assert.equal("passwordHash" in publicRow, false);

    const mine = await call("GET", "/api/reports/mine", { token: reporter.token });
    assert.ok(mine.payload.reports.some((row) => row.id === firstReportId));
    const legacyMine = await call("GET", "/api/my-complaints", { token: reporter.token });
    assert.ok(legacyMine.payload.complaints.some((row) => row.id === firstReportId));

    const updated = await call("PATCH", `/api/reports/${firstReportId}`, {
      token: reporter.token,
      body: { description: "Updated private synthetic description", status: "VERIFIED" },
    });
    assert.equal(updated.status, 400, "status must not be mutable through user PATCH");

    const allowedUpdate = await call("PATCH", `/api/reports/${firstReportId}`, {
      token: reporter.token,
      body: { description: "Updated private synthetic description" },
    });
    assert.equal(allowedUpdate.status, 200);

    const foreignUpdate = await call("PATCH", `/api/reports/${firstReportId}`, {
      token: second.token,
      body: { description: "Attempted unauthorized edit" },
    });
    assert.equal(foreignUpdate.status, 403);

    const userAdminAction = await call("PATCH", `/api/reports/${firstReportId}/verify`, { token: reporter.token });
    assert.equal(userAdminAction.status, 403);
    const foreignDelete = await call("DELETE", `/api/reports/${firstReportId}`, { token: second.token });
    assert.equal(foreignDelete.status, 403);

    const ownDeleteReport = await call("POST", "/api/complaints", {
      token: reporter.token,
      body: { crime_type: "Theft", description: "Synthetic disposable report", location: "Demo", lat: 19, lng: 72, share_description: "true" },
    });
    assert.equal(ownDeleteReport.status, 201);
    deletableReportId = ownDeleteReport.payload.report.id;
    const deleted = await call("DELETE", `/api/complaints/${deletableReportId}`, { token: reporter.token });
    assert.equal(deleted.status, 200);

    const persisted = await CrimeReport.findByPk(firstReportId);
    assert.equal(persisted.description, "Updated private synthetic description");
    assert.equal(persisted.userId, reporter.id);
    const withOwner = await CrimeReport.findByPk(firstReportId, { include: [{ association: "reporter" }] });
    assert.equal(withOwner.reporter.id, reporter.id);
  });

  await t.test("evidence type validation, persistence, safe paths, and protected retrieval", async () => {
    const adminLogin = await call("POST", "/api/login-admin", {
      body: { email: adminEmail, password: testPasswords.admin },
    });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.payload.access_token;

    const fixtures = [
      { type: "image/jpeg", name: "evidence.jpg", bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]) },
      { type: "image/png", name: "../../private.png", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]) },
      { type: "image/webp", name: "..\\..\\evidence.webp", bytes: Buffer.from("RIFF0000WEBP", "ascii") },
    ];

    for (const fixture of fixtures) {
      const form = new FormData();
      form.set("category", "Theft");
      form.set("description", "Synthetic evidence upload test");
      form.set("location", "Synthetic test location");
      form.set("shareDescription", "false");
      form.set("image", new Blob([fixture.bytes], { type: fixture.type }), fixture.name);

      const filesBefore = await uploadFileNames();
      const result = await callMultipart("/api/reports", reporter.token, form);
      const filesAfter = await uploadFileNames();
      for (const name of filesAfter) {
        if (!filesBefore.has(name)) createdEvidenceFiles.add(path.resolve(uploadDirectory, name));
      }
      assert.equal(result.status, 201);
      const row = result.payload.report;
      const diskPath = path.resolve(uploadDirectory, row.evidence_url);
      createdEvidenceFiles.add(diskPath);

      assert.match(row.evidence_url, /^[0-9a-f-]{36}\.(jpg|png|webp)$/i);
      assert.equal(row.evidence_mime_type, fixture.type);
      assert.equal(Number(row.evidence_size), fixture.bytes.length);
      assert.ok(row.evidence_original_name);
      assert.equal(row.evidence_original_name.includes("/"), false);
      assert.equal(row.evidence_original_name.includes("\\"), false);
      assert.deepEqual(await readFile(diskPath), fixture.bytes);

      const persisted = await CrimeReport.findByPk(row.id);
      assert.equal(persisted.evidenceUrl, row.evidence_url);
      assert.equal(persisted.evidenceOriginalName, row.evidence_original_name);
      assert.equal(persisted.evidenceMimeType, fixture.type);
      assert.equal(Number(persisted.evidenceSize), fixture.bytes.length);

      const noToken = await fetch(`${baseUrl}/api/reports/${row.id}/evidence`);
      assert.equal(noToken.status, 401);
      const anotherUser = await fetch(`${baseUrl}/api/reports/${row.id}/evidence`, {
        headers: { authorization: `Bearer ${second.token}` },
      });
      assert.equal(anotherUser.status, 403);

      const evidence = await fetch(`${baseUrl}/api/reports/${row.id}/evidence`, {
        headers: { authorization: `Bearer ${reporter.token}` },
      });
      assert.equal(evidence.status, 200);
      assert.equal(evidence.headers.get("content-type").split(";")[0], fixture.type);
      assert.equal(evidence.headers.get("x-content-type-options"), "nosniff");
      assert.equal(evidence.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(Buffer.from(await evidence.arrayBuffer()), fixture.bytes);

      const adminEvidence = await fetch(`${baseUrl}/api/reports/${row.id}/evidence`, {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      assert.equal(adminEvidence.status, 200);

      const publicRow = (await call("GET", "/api/reports")).payload.reports.find((item) => item.id === row.id);
      assert.equal("evidence_url" in publicRow, false);
      assert.equal("evidence_original_name" in publicRow, false);
      const staticAttempt = await fetch(`${baseUrl}/uploads/reports/${row.evidence_url}`);
      assert.equal(staticAttempt.status, 404);
    }

    const beforeRejected = new Set(await readdir(uploadDirectory));
    const unsupported = new FormData();
    unsupported.set("category", "Theft");
    unsupported.set("description", "Unsupported file test");
    unsupported.set("location", "Synthetic test location");
    unsupported.set("image", new Blob([Buffer.from("plain text")], { type: "text/plain" }), "unsupported.txt");
    const unsupportedResult = await callMultipart("/api/reports", reporter.token, unsupported);
    assert.equal(unsupportedResult.status, 400);

    const spoofed = new FormData();
    spoofed.set("category", "Theft");
    spoofed.set("description", "Mismatched file signature test");
    spoofed.set("location", "Synthetic test location");
    spoofed.set("image", new Blob([Buffer.from("not a PNG")], { type: "image/png" }), "spoof.png");
    const spoofedResult = await callMultipart("/api/reports", reporter.token, spoofed);
    assert.equal(spoofedResult.status, 400);

    const oversized = new FormData();
    oversized.set("category", "Theft");
    oversized.set("description", "Oversized file test");
    oversized.set("location", "Synthetic test location");
    oversized.set("image", new Blob([Buffer.alloc(5 * 1024 * 1024 + 1, 0x89)], { type: "image/png" }), "too-large.png");
    const oversizedResult = await callMultipart("/api/reports", reporter.token, oversized);
    assert.equal(oversizedResult.status, 413);

    assert.deepEqual(new Set(await readdir(uploadDirectory)), beforeRejected, "rejected uploads must leave no files behind");
  });

  await t.test("administrator review, rejected visibility, and deletion", async () => {
    const adminLogin = await call("POST", "/api/login-admin", {
      body: { email: adminEmail, password: testPasswords.admin },
    });
    assert.equal(adminLogin.status, 200);
    adminToken = adminLogin.payload.access_token;

    const userForbiddenList = await call("GET", "/api/complaints?include_rejected=true", { token: reporter.token });
    assert.equal(userForbiddenList.status, 403);

    const verified = await call("PATCH", `/api/complaints/${firstReportId}/review`, { token: adminToken });
    assert.equal(verified.status, 200);
    assert.equal(verified.payload.report.status, "UNDER_REVIEW");
    assert.equal(verified.payload.report.reviewedByUserId, undefined);

    const finalVerify = await call("PATCH", `/api/reports/${firstReportId}/verify`, { token: adminToken });
    assert.equal(finalVerify.status, 200);
    assert.equal(finalVerify.payload.report.status, "VERIFIED");

    const lockedUpdate = await call("PATCH", `/api/reports/${firstReportId}`, {
      token: reporter.token,
      body: { description: "Must not update after review" },
    });
    assert.equal(lockedUpdate.status, 409);

    const rejectedCreate = await call("POST", "/api/reports", {
      token: second.token,
      body: { category: "Robbery", description: "Synthetic report for rejection", location: "Demo" },
    });
    assert.equal(rejectedCreate.status, 201);
    rejectedReportId = rejectedCreate.payload.report.id;

    const rejected = await call("PATCH", `/api/complaints/${rejectedReportId}/reject`, {
      token: adminToken,
      body: { admin_notes: "Synthetic test rejection reason" },
    });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.payload.report.status, "REJECTED");
    assert.equal(rejected.payload.report.admin_notes, "Synthetic test rejection reason");

    const publicReports = await call("GET", "/api/reports");
    assert.equal(publicReports.payload.reports.some((row) => row.id === rejectedReportId), false);
    const forcedRejectedFilter = await call("GET", "/api/reports?status=REJECTED");
    assert.equal(forcedRejectedFilter.payload.reports.length, 0);

    const userRejectedDetail = await call("GET", `/api/reports/${rejectedReportId}`, { token: second.token });
    assert.equal(userRejectedDetail.status, 200, "owner can view their own rejected report");
    const publicRejectedDetail = await call("GET", `/api/reports/${rejectedReportId}`);
    assert.equal(publicRejectedDetail.status, 404);

    const adminList = await call("GET", "/api/complaints?include_rejected=true", { token: adminToken });
    const adminRejectedRow = adminList.payload.complaints.find((row) => row.id === rejectedReportId);
    assert.ok(adminRejectedRow);
    assert.equal(adminRejectedRow.email, secondEmail);
    assert.equal("passwordHash" in adminRejectedRow, false);

    const adminDelete = await call("DELETE", `/api/reports/${rejectedReportId}`, { token: adminToken });
    assert.equal(adminDelete.status, 200);
  });
});

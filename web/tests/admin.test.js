import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createAdminSession,
  validatePng,
  validateFields,
} from "../src/lib/adminApi.js";
const token = "github_pat_TEST_ONLY";
const fields = { name: "Novi kanal", country: "Hrvatska", category: "Sport" };
const response = (body, status = 200) => ({
  ok: status === 200,
  status,
  json: async () => body,
});
function mockApi({ owner = true, conflict = false, race = false } = {}) {
  let head = "old-head";
  const calls = [];
  let newTree;
  const fetcher = async (url, options) => {
    const body = options.body && JSON.parse(options.body);
    calls.push({ url, method: options.method, body });
    if (url.endsWith("/user"))
      return response({
        login: owner ? "abrnjic" : "other",
        id: owner ? 6376177 : 987,
      });
    if (url.endsWith("/repos/abrnjic/logo-tv"))
      return response({ owner: { id: 6376177 } });
    if (url.endsWith("/git/ref/heads/main"))
      return response({
        object: {
          sha:
            conflict &&
            calls.filter((call) => call.url.endsWith("/git/ref/heads/main"))
              .length > 1
              ? "changed"
              : head,
        },
      });
    if (url.endsWith("/git/commits/old-head"))
      return response({ tree: { sha: "old-tree" } });
    if (url.includes("/contents/web/catalogue-overrides.json"))
      return response({
        content: btoa(
          JSON.stringify({
            version: 1,
            channels: {
              unrelated: {
                name: "Keep this",
                country: "France",
                category: "General",
              },
            },
          }),
        ),
      });
    if (url.endsWith("/git/blobs")) return response({ sha: "image-blob" });
    if (url.endsWith("/git/trees")) {
      newTree = body;
      return response({ sha: "new-tree" });
    }
    if (url.endsWith("/git/commits")) return response({ sha: "new-head" });
    if (url.endsWith("/git/refs/heads/main")) {
      if (race) return response({}, 422);
      head = body.sha;
      return response({});
    }
    throw Error(`Unexpected ${url}`);
  };
  return {
    fetcher,
    calls,
    get tree() {
      return newTree;
    },
  };
}
test("unverified or different GitHub accounts cannot mutate the catalogue", async () => {
  const api = mockApi({ owner: false });
  const session = createAdminSession(token, api.fetcher);
  await assert.rejects(session.save({ id: "x", fields }), /vlasniku/);
  await assert.rejects(session.login(), /samo abrnjic/);
  await assert.rejects(session.save({ id: "x", fields }), /vlasniku/);
  assert.ok(api.calls.every((call) => call.method === "GET"));
});
test("owner saves group metadata atomically, preserves unrelated data and logs out", async () => {
  const api = mockApi();
  const session = createAdminSession(token, api.fetcher);
  await session.login();
  await session.save({
    id: "hrt1",
    ids: ["hrt1", "hrt1hr"],
    fields,
    preferred: true,
  });
  const payload = JSON.parse(api.tree.tree[0].content);
  assert.equal(payload.channels.unrelated.name, "Keep this");
  assert.equal(payload.channels.hrt1.name, fields.name);
  assert.ok(Number.isFinite(Date.parse(payload.channels.hrt1.updatedAt)));
  assert.equal(payload.channels.unrelated.updatedAt, undefined);
  assert.equal(payload.channels.hrt1hr.name, fields.name);
  assert.equal(payload.channels.hrt1.preferred, true);
  assert.equal(payload.channels.hrt1hr.preferred, false);
  assert.equal(
    api.calls.find((call) => call.method === "PATCH").body.force,
    false,
  );
  session.logout();
  await assert.rejects(session.save({ id: "x", fields }), /vlasniku/);
});
test("remote changes and update races are rejected without forced overwrites", async () => {
  for (const options of [{ conflict: true }, { race: true }]) {
    const api = mockApi(options);
    const session = createAdminSession(token, api.fetcher);
    await session.login();
    await assert.rejects(session.save({ id: "hrt1", fields }), /promijenjen/);
    assert.ok(api.calls.every((call) => !call.body?.force));
  }
});
test("malformed files, dangerous paths and invalid metadata are rejected", async () => {
  assert.throws(() => validatePng(new Uint8Array(100)), /PNG/);
  assert.throws(
    () => validateFields({ ...fields, name: "<script>" }),
    /Ispuni/,
  );
  const api = mockApi();
  const session = createAdminSession(token, api.fetcher);
  await session.login();
  await assert.rejects(session.save({ id: "__proto__", fields }), /oznaka/);
  await assert.rejects(session.save({ id: "new", fields, isNew: true }), /PNG/);
  assert.ok(api.calls.every((call) => call.method === "GET"));
});

test("a new PNG and its metadata are written in one atomic tree and commit", async () => {
  const api = mockApi();
  const session = createAdminSession(token, api.fetcher);
  await session.login();
  const bytes = new Uint8Array(
    readFileSync(new URL("../public/logos/hrt1.png", import.meta.url)),
  );
  await session.save({
    id: "test-new-hr",
    fields,
    imageBytes: bytes,
    sourcePath: "logos/custom/test-new-hr.png",
    isNew: true,
    hidden: true, // A stale editor flag must never hide a new upload.
  });
  assert.equal(api.tree.tree.length, 2);
  assert.equal(api.tree.tree[0].path, "logos/custom/test-new-hr.png");
  const payload = JSON.parse(api.tree.tree[1].content);
  assert.equal(payload.channels["test-new-hr"].added, true);
  assert.equal(payload.channels["test-new-hr"].hidden, false);
  assert.equal(
    payload.channels["test-new-hr"].sourcePath,
    "logos/custom/test-new-hr.png",
  );
  assert.equal(
    api.calls.filter(
      (call) => call.url.endsWith("/git/commits") && call.method === "POST",
    ).length,
    1,
  );
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { base58Decode, base58Encode, isSolanaAddress } from "./base58.ts";
import {
  buildSignInMessage,
  checkSignIn,
  formatTokenAmount,
  meetsMinimum,
  newNonce,
  newSession,
  parseMinBalance,
  readToken,
  signToken,
  sumTokenAccounts,
  type SessionPayload,
} from "./core.server.ts";
import { fetchTokenBalance } from "./balance.server.ts";
import { ANCHOR_MINT, NONCE_TTL_MS, SESSION_TTL_MS } from "./config.ts";

// Throwaway test-only values: a random HMAC secret and a freshly generated keypair.
const SECRET = randomBytes(32).toString("hex");

function throwawayWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = Buffer.from(publicKey.export({ format: "jwk" }).x as string, "base64url");
  const address = base58Encode(raw);
  const signB64 = (text: string) =>
    sign(null, Buffer.from(text, "utf8"), privateKey).toString("base64");
  return { address, signB64 };
}

describe("base58", () => {
  it("round-trips, keeps leading zeros, decodes a real mint to 32 bytes", () => {
    for (let i = 0; i < 50; i++) {
      const bytes = randomBytes(32);
      if (i % 5 === 0) bytes[0] = 0;
      assert.deepEqual(Buffer.from(base58Decode(base58Encode(bytes))!), bytes);
    }
    assert.equal(base58Encode(new Uint8Array(32)), "1".repeat(32));
    assert.equal(base58Decode(ANCHOR_MINT)?.length, 32);
    assert.ok(isSolanaAddress(ANCHOR_MINT));
    assert.ok(!isSolanaAddress("0OIl" + "1".repeat(40)));
    assert.ok(!isSolanaAddress("abc"));
  });
});

describe("sign-in", () => {
  const host = "memecoindev.vip";

  it("accepts a valid wallet signature over the server-built message", () => {
    const w = throwawayWallet();
    const nonce = newNonce(w.address, host);
    const token = signToken(SECRET, nonce);
    const message = buildSignInMessage(nonce);
    assert.match(message, /^memecoindev\.vip wants you to sign in with your Solana account:\n/);
    assert.match(message, /Nonce: [0-9a-f]{32}/);
    const res = checkSignIn(SECRET, token, w.signB64(message), host);
    assert.equal(res.ok, true);
    if (res.ok) assert.equal(res.nonce.a, w.address);
  });

  it("rejects a signature from a different wallet", () => {
    const victim = throwawayWallet();
    const attacker = throwawayWallet();
    const nonce = newNonce(victim.address, host);
    const res = checkSignIn(
      SECRET,
      signToken(SECRET, nonce),
      attacker.signB64(buildSignInMessage(nonce)),
      host,
    );
    assert.deepEqual(res, { ok: false, reason: "bad_signature" });
  });

  it("rejects a signature over different text", () => {
    const w = throwawayWallet();
    const nonce = newNonce(w.address, host);
    const res = checkSignIn(
      SECRET,
      signToken(SECRET, nonce),
      w.signB64(buildSignInMessage(nonce) + " "),
      host,
    );
    assert.deepEqual(res, { ok: false, reason: "bad_signature" });
  });

  it("rejects forged, tampered, expired and cross-site nonces", () => {
    const w = throwawayWallet();
    const nonce = newNonce(w.address, host);
    const sig = w.signB64(buildSignInMessage(nonce));
    // signed with another secret
    assert.equal(checkSignIn(SECRET, signToken("x".repeat(64), nonce), sig, host).ok, false);
    // payload swapped to another address, old MAC kept
    const [, mac] = signToken(SECRET, nonce).split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ ...nonce, a: throwawayWallet().address }),
    ).toString("base64url");
    assert.equal(checkSignIn(SECRET, `${forgedBody}.${mac}`, sig, host).ok, false);
    // expired
    assert.deepEqual(
      checkSignIn(SECRET, signToken(SECRET, nonce), sig, host, nonce.iat + NONCE_TTL_MS + 1),
      { ok: false, reason: "bad_nonce" },
    );
    // issued for a different host
    assert.deepEqual(checkSignIn(SECRET, signToken(SECRET, nonce), sig, "evil.example"), {
      ok: false,
      reason: "wrong_domain",
    });
    // junk inputs
    assert.equal(checkSignIn(SECRET, "garbage", sig, host).ok, false);
    assert.equal(checkSignIn(SECRET, signToken(SECRET, nonce), "AAAA", host).ok, false);
    assert.equal(checkSignIn(SECRET, signToken(SECRET, nonce), 42, host).ok, false);
  });

  it("does not accept a nonce token as a session or vice versa", () => {
    const w = throwawayWallet();
    const nonceToken = signToken(SECRET, newNonce(w.address, host));
    assert.equal(readToken<SessionPayload>(SECRET, nonceToken, "session"), null);
    const sessionToken = signToken(SECRET, newSession(w.address, 1n, 6));
    assert.equal(checkSignIn(SECRET, sessionToken, w.signB64("x"), host).ok, false);
  });

  it("sessions last 24h and then stop validating", () => {
    const w = throwawayWallet();
    const s = newSession(w.address, 5n, 6, 1_000);
    assert.equal(s.exp - s.iat, SESSION_TTL_MS);
    const t = signToken(SECRET, s);
    assert.ok(readToken<SessionPayload>(SECRET, t, "session", 2_000));
    assert.equal(readToken<SessionPayload>(SECRET, t, "session", s.exp), null);
  });
});

describe("balance logic", () => {
  it("parses ANCHOR_MIN_BALANCE with a safe fallback", () => {
    assert.equal(parseMinBalance(undefined, 100_000), 100_000);
    assert.equal(parseMinBalance("250,000", 100_000), 250_000);
    assert.equal(parseMinBalance("1_000_000", 100_000), 1_000_000);
    assert.equal(parseMinBalance("lots", 100_000), 100_000);
    assert.equal(parseMinBalance("-5", 100_000), 100_000);
  });

  it("compares raw amounts against whole-token minimums exactly", () => {
    const dec = 6;
    const min = 100_000;
    assert.equal(meetsMinimum(100_000_000_000n, dec, min), true); // exactly 100k
    assert.equal(meetsMinimum(99_999_999_999n, dec, min), false); // 1 raw unit short
    assert.equal(meetsMinimum(0n, 0, min), false); // no token account
    assert.equal(meetsMinimum(0n, dec, 0), true); // min 0 lets everyone in
    assert.equal(meetsMinimum(1_500_000n, dec, 1.5), true);
    assert.equal(meetsMinimum(1_499_999n, dec, 1.5), false);
  });

  it("sums multiple token accounts for the mint and ignores others", () => {
    const acct = (mint: string, amount: string, decimals = 6) => ({
      account: { data: { parsed: { info: { mint, tokenAmount: { amount, decimals } } } } },
    });
    const r = sumTokenAccounts(
      [
        acct(ANCHOR_MINT, "60000000000"),
        acct(ANCHOR_MINT, "40000000000"),
        acct("So11111111111111111111111111111111111111112", "999999999999"),
      ],
      ANCHOR_MINT,
    );
    assert.deepEqual(r, { raw: 100_000_000_000n, dec: 6 });
    assert.equal(formatTokenAmount(r.raw, r.dec), "100,000");
    assert.deepEqual(sumTokenAccounts([], ANCHOR_MINT), { raw: 0n, dec: 0 });
    assert.throws(() => sumTokenAccounts(undefined, ANCHOR_MINT));
  });

  it("surfaces RPC failures as errors instead of a zero balance", async () => {
    const failing = (async () => new Response("rate limited", { status: 429 })) as typeof fetch;
    await assert.rejects(
      fetchTokenBalance(throwawayWallet().address, ANCHOR_MINT, undefined, failing),
      /429/,
    );
    const rpcErr = (async () =>
      Response.json({ jsonrpc: "2.0", error: { code: -32005 } })) as typeof fetch;
    await assert.rejects(
      fetchTokenBalance(throwawayWallet().address, ANCHOR_MINT, undefined, rpcErr),
      /-32005/,
    );
  });
});

import { DEFAULT_MIN_BALANCE } from "./config.ts";
import { resolveMinBalance } from "./core.server.ts";

describe("members minimum (flat token count)", () => {
  it("defaults to 5,000 whole $ANCHOR", () => {
    assert.equal(DEFAULT_MIN_BALANCE, 5_000);
    assert.equal(resolveMinBalance({}), 5_000);
  });

  it("ignores a leftover ANCHOR_MIN_USD (no dollar gate)", () => {
    assert.equal(resolveMinBalance({ ANCHOR_MIN_USD: "25" }), DEFAULT_MIN_BALANCE);
    assert.equal(resolveMinBalance({ ANCHOR_MIN_USD: "$1,000" }), DEFAULT_MIN_BALANCE);
    assert.equal(
      resolveMinBalance({ ANCHOR_MIN_USD: "25", ANCHOR_MIN_BALANCE: "20000" }),
      20_000,
    );
  });

  it("lets ANCHOR_MIN_BALANCE override the default; invalid values fall back", () => {
    assert.equal(resolveMinBalance({ ANCHOR_MIN_BALANCE: "10,000" }), 10_000);
    assert.equal(resolveMinBalance({ ANCHOR_MIN_BALANCE: "25_000" }), 25_000);
    assert.equal(resolveMinBalance({ ANCHOR_MIN_BALANCE: "" }), DEFAULT_MIN_BALANCE);
    assert.equal(resolveMinBalance({ ANCHOR_MIN_BALANCE: "abc" }), DEFAULT_MIN_BALANCE);
    assert.equal(resolveMinBalance({ ANCHOR_MIN_BALANCE: "-1" }), DEFAULT_MIN_BALANCE);
  });

  it("the live sign-in flow gates on the token count", async () => {
    const { decideSignIn } = await import("./flow.server.ts");
    const host = "memecoindev.vip";
    const w = throwawayWallet();
    const dec = 6;
    const minBalance = resolveMinBalance({ ANCHOR_MIN_USD: "25" });
    const attempt = async (raw: bigint) => {
      const n = newNonce(w.address, host);
      return decideSignIn(
        { secret: SECRET, host, minBalance, owners: undefined, readBalance: async () => ({ raw, dec }) },
        signToken(SECRET, n),
        w.signB64(buildSignInMessage(n)),
      );
    };
    assert.equal((await attempt(5_000n * 10n ** 6n)).kind, "holder");
    assert.equal((await attempt(5_000n * 10n ** 6n - 1n)).kind, "not_holder");
  });
});

import { hasInjectedSolanaWallet, isMobileUserAgent, walletBrowseLinks } from "./mobile-wallets.ts";

describe("mobile wallet deep links", () => {
  it("builds Phantom/Solflare/Backpack browse links with encoded URL and ref", () => {
    const [phantom, solflare, backpack] = walletBrowseLinks(
      "https://memecoindev.vip/members",
      "https://memecoindev.vip",
    );
    assert.equal(
      phantom.href,
      "https://phantom.app/ul/browse/https%3A%2F%2Fmemecoindev.vip%2Fmembers?ref=https%3A%2F%2Fmemecoindev.vip",
    );
    assert.equal(
      solflare.href,
      "https://solflare.com/ul/v1/browse/https%3A%2F%2Fmemecoindev.vip%2Fmembers?ref=https%3A%2F%2Fmemecoindev.vip",
    );
    assert.equal(
      backpack.href,
      "https://backpack.app/ul/v1/browse/https%3A%2F%2Fmemecoindev.vip%2Fmembers?ref=https%3A%2F%2Fmemecoindev.vip",
    );
  });
  it("detects mobile and injected wallets", () => {
    assert.ok(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"));
    assert.equal(isMobileUserAgent("Mozilla/5.0 (X11; Linux x86_64) Chrome/129"), false);
    assert.equal(hasInjectedSolanaWallet({}), false);
    assert.ok(hasInjectedSolanaWallet({ phantom: { solana: {} } }));
  });
});

import { decideSignIn, decideState, type FlowCtx } from "./flow.server.ts";
import { parseOwnerWallets } from "./owners.ts";
import { RECHECK_INTERVAL_MS } from "./config.ts";

describe("owner allowlist (OWNER_WALLETS)", () => {
  const host = "memecoindev.vip";
  const owner = throwawayWallet();
  const stranger = throwawayWallet();
  let balanceReads = 0;
  const ctx: FlowCtx = {
    secret: SECRET,
    host,
    minBalance: DEFAULT_MIN_BALANCE,
    owners: `junk, ${owner.address},,0OIl`,
    readBalance: async () => { balanceReads++; return { raw: 0n, dec: 6 }; }, // everyone holds 0 (mock, no network)
  };
  const nonceFor = (address: string) => {
    const n = newNonce(address, host);
    return { token: signToken(SECRET, n), msg: buildSignInMessage(n) };
  };

  it("parses only valid base58 pubkeys", () => {
    assert.deepEqual([...parseOwnerWallets(ctx.owners)], [owner.address]);
    assert.equal(parseOwnerWallets(undefined).size, 0);
  });

  it("allowlisted wallet with 0 balance gets in with a valid signature", async () => {
    const { token, msg } = nonceFor(owner.address);
    const out = await decideSignIn(ctx, token, owner.signB64(msg));
    assert.equal(out.kind, "holder");
    assert.ok(out.kind === "holder" && out.owner && out.session.o === 1 && out.session.raw === "0");
  });

  it("forged signatures for an allowlisted address are rejected before any allowlist/balance logic", async () => {
    const { token, msg } = nonceFor(owner.address);
    const before = balanceReads;
    for (const sig of [stranger.signB64(msg), randomBytes(64).toString("base64"), "", undefined, "AAAA"]) {
      const out = await decideSignIn(ctx, token, sig);
      assert.equal(out.kind, "error");
    }
    const other = nonceFor(owner.address); // valid signature over a different nonce
    assert.equal((await decideSignIn(ctx, token, owner.signB64(other.msg))).kind, "error");
    // forged nonce token (wrong secret) with a real signature
    const n = newNonce(owner.address, host);
    assert.equal((await decideSignIn(ctx, signToken(randomBytes(32).toString("hex"), n), owner.signB64(buildSignInMessage(n)))).kind, "error");
    assert.equal(balanceReads, before);
  });

  it("non-listed 0-balance wallet is rejected even with a valid signature", async () => {
    const { token, msg } = nonceFor(stranger.address);
    const out = await decideSignIn(ctx, token, stranger.signB64(msg));
    assert.equal(out.kind, "not_holder");
  });

  it("owner gets in even if the balance RPC is down; others get a retry error", async () => {
    const down = { ...ctx, readBalance: async () => { throw new Error("rpc down"); } };
    const a = nonceFor(owner.address);
    assert.equal((await decideSignIn(down, a.token, owner.signB64(a.msg))).kind, "holder");
    const b = nonceFor(stranger.address);
    assert.equal((await decideSignIn(down, b.token, stranger.signB64(b.msg))).kind, "error");
  });

  it("hourly recheck honors the allowlist and drops access once removed", async () => {
    const t0 = Date.now() - 2 * RECHECK_INTERVAL_MS;
    const cookie = signToken(SECRET, { ...newSession(owner.address, 0n, 6, t0), o: 1 });
    const ok = await decideState(ctx, cookie);
    assert.ok(ok.kind === "holder" && ok.owner && ok.rewrite?.o === 1);
    assert.equal((await decideState({ ...ctx, owners: "" }, cookie)).kind, "not_holder");
    const s2 = signToken(SECRET, newSession(stranger.address, 0n, 6, t0));
    assert.equal((await decideState(ctx, s2)).kind, "not_holder");
    // within the hour an owner cookie needs no network read
    const fresh = signToken(SECRET, { ...newSession(owner.address, 0n, 6), o: 1 });
    const before = balanceReads;
    assert.ok((await decideState(ctx, fresh)).kind === "holder" && balanceReads === before);
    // a cookie with o:1 but a bad HMAC is rejected
    const forged = cookie.slice(0, -2) + (cookie.endsWith("A") ? "BB" : "AA");
    assert.equal((await decideState(ctx, forged)).kind, "signed_out");
  });
});

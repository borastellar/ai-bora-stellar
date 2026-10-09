/**
 * Tests for the escaped magic-link email builder (issue #102).
 *
 * Run (from the repo root or back/):
 *   node --experimental-strip-types --test back/test/magic-link-escape.test.ts
 *
 * client-magic-link.ts previously interpolated client.name and the email
 * straight into an HTML template with no escaping (send-email.ts escapes its
 * own inputs; this file did not). buildMagicLinkEmail now escapes both at every
 * interpolation point. These tests pin the guarantee:
 *
 *   - a name containing '<' renders as '&lt;' in the body (no raw '<script>');
 *   - a normal name renders unchanged (no double-escaping of real names).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMagicLinkEmail, escapeHtml } from '../services/magic-link-email.ts';

test('escapeHtml neutralizes the five dangerous characters', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
  assert.equal(escapeHtml('"quotes"'), '&quot;quotes&quot;');
  assert.equal(escapeHtml("'apos'"), '&#39;apos&#39;');
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
});

test('escapeHtml escapes the ampersand FIRST (no double-escape)', () => {
  // '&' must become '&amp;' and not '&amp;amp;'.
  assert.equal(escapeHtml('&'), '&amp;');
  assert.equal(escapeHtml('<&'), '&lt;&amp;');
});

test('a name containing <script> renders escaped, not as live markup', () => {
  const html = buildMagicLinkEmail({
    name: '<script>alert(1)</script>',
    email: 'victim@aibora.pt',
    appUrl: 'https://aibora.pt',
    token: 'tok',
  });
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!html.includes('<script>alert(1)</script>'), 'raw script must not appear');
});

test('a name containing <img onerror> payload renders escaped', () => {
  const html = buildMagicLinkEmail({
    name: '<img src=x onerror=alert(document.cookie)>',
    email: 'a@b.c',
    token: 'tok',
  });
  assert.ok(html.includes('&lt;img src=x onerror=alert(document.cookie)&gt;'));
  assert.ok(!html.includes('<img src=x onerror='), 'raw onerror payload must not appear');
});

test('a normal name renders unchanged (no double-escaping)', () => {
  const html = buildMagicLinkEmail({
    name: 'João Silva',
    email: 'joao@exemplo.pt',
    appUrl: 'https://aibora.pt',
    token: 'abc123',
  });
  assert.ok(html.includes('Hello, João Silva'));
  assert.ok(html.includes('<strong>Client:</strong> João Silva'));
  assert.ok(html.includes('<strong>Email:</strong> joao@exemplo.pt'));
  assert.ok(html.includes('href="https://aibora.pt/client/login/abc123"'));
});

test('a name that is itself an HTML entity is escaped (defended against pre-encoding)', () => {
  // If a client literally typed the entity text "&lt;", it must not be left
  // as raw '<'. Escaping turns it into '&amp;lt;'.
  const html = buildMagicLinkEmail({ name: '&lt;', email: 'a@b.c', token: 't' });
  assert.ok(html.includes('&amp;lt;'));
});

test('the login link is always built from appUrl + token', () => {
  const html = buildMagicLinkEmail({
    name: 'X',
    email: 'a@b.c',
    appUrl: 'https://staging.aibora.pt',
    token: 't0k3n',
  });
  assert.ok(html.includes('href="https://staging.aibora.pt/client/login/t0k3n"'));
});

import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeIdentity, sameStudent } from './identityMigration.js'

const roster = Array.from({ length: 5 }, (_, i) => ({
  grade: 2, class: 4, name: `학생${i}`, number: 17 + i, previousNumbers: [18 + i],
}))

test('all five corrections preserve student identity, including stale selections', () => {
  for (const entry of roster) {
    const old = { ...entry, number: entry.previousNumbers[0] }
    const migrated = normalizeIdentity(old, roster)
    assert.equal(migrated.number, entry.number)
    assert.ok(sameStudent(migrated, normalizeIdentity(entry, roster)))
    assert.ok(sameStudent(migrated, normalizeIdentity(old, roster)))
    assert.equal(normalizeIdentity(migrated, roster), migrated)
    assert.equal(old.number, entry.previousNumbers[0])
  }
})

test('overlapping numbers never transfer ownership between students', () => {
  const oldFirst = { ...roster[0], number: 18 }
  assert.equal(sameStudent(normalizeIdentity(oldFirst, roster), roster[1]), false)
  for (const changes of [{ name: '다른학생' }, { class: 3 }, { grade: 3 }, { number: 99 }]) {
    const unrelated = { ...oldFirst, ...changes }
    assert.equal(normalizeIdentity(unrelated, roster), unrelated)
  }
})

test('missing or ambiguous correction data does not guess identity', () => {
  assert.equal(normalizeIdentity(null, roster), null)
  const old = { ...roster[0], number: 18 }
  assert.equal(normalizeIdentity(old, []), old)
  assert.equal(normalizeIdentity(old, [...roster, { ...roster[0], number: 16 }]), old)
})

// 번호 정정 이력은 명단에 보관한다. 이름만 같은 학생을 연결하지 않는다.
export function normalizeIdentity(identity, roster) {
  if (!identity) return identity
  const matches = roster.filter((entry) =>
    entry.grade === identity.grade && entry.class === identity.class &&
    entry.name === identity.name &&
    (entry.number === identity.number || entry.previousNumbers?.includes(identity.number))
  )
  if (matches.length !== 1 || matches[0].number === identity.number) return identity
  return { ...identity, number: matches[0].number }
}

export function sameStudent(a, b) {
  return !!a && !!b && a.grade === b.grade && a.class === b.class &&
    a.number === b.number && a.name === b.name
}

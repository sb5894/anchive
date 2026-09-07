// roster의 grade/class/number를 화면에 어떻게 쓸지 한곳에 모아 둔다.
//
// 명단에는 초등학생만 있는 게 아니다:
//   - 유치원은 학년이 없고 반 이름이 한글이다(grade '유치원', class '햇살반')
//   - 교사는 번호가 없다(number 99로 약속하고 화면에서 숨긴다)
// 이 규칙이 게시물·댓글·관리자 로그 등 여러 화면에 흩어지면 금방 어긋나므로
// 여기서만 정의하고 각 화면은 이 함수들만 쓴다.

// 교사를 나타내는 약속된 번호. 학생 번호와 겹치지 않고, 반마다 교사가 1명이라
// 같은 반에서 중복될 일도 없다. 번호를 비우면 roster 문서 id가 겹쳐 명단이
// 조용히 사라지므로(scripts/importRoster.mjs 참고) 반드시 이 값을 넣어야 한다.
export const TEACHER_NUMBER = 99

// '3' 같은 숫자는 Number로, '유치원' 같은 한글은 문자열 그대로 들어온다.
function isNumeric(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

// 1 -> '1학년', '유치원' -> '유치원'
export function gradeLabel(grade) {
  return isNumeric(grade) ? `${grade}학년` : String(grade ?? '')
}

// 2 -> '2반', '햇살반' -> '햇살반'(이미 '반'이 붙어 있으므로 덧붙이지 않는다)
export function classLabel(klass) {
  return isNumeric(klass) ? `${klass}반` : String(klass ?? '')
}

// 게시물·댓글에 쓰는 "소속 + 이름".
// 숫자 학년은 기존 표기('3-2 이학생')를 그대로 유지해서 이미 올라간 게시물의
// 화면이 바뀌지 않게 하고, 한글 학년만 '유치원 햇살반 김유치'로 띄어 쓴다.
export function whoLabel(info) {
  if (!info) return ''
  const { grade, class: klass, name } = info
  if (isNumeric(grade)) return `${grade}-${klass} ${name}`
  return `${gradeLabel(grade)} ${classLabel(klass)} ${name}`
}

// 이름 고르기 드롭다운의 한 줄. 교사는 번호를 숨긴다.
export function rosterOptionLabel(student) {
  if (student.number === TEACHER_NUMBER) return student.name
  return `${student.number}번 ${student.name}`
}

// 학년·반 정렬. 숫자끼리는 오름차순, 한글끼리는 가나다순으로 두되
// 유치원이 1학년보다 앞에 오도록 문자를 숫자보다 먼저 놓는다.
export function compareGrade(a, b) {
  const aNum = isNumeric(a)
  const bNum = isNumeric(b)
  if (aNum && bNum) return a - b
  if (!aNum && !bNum) return String(a).localeCompare(String(b), 'ko')
  return aNum ? 1 : -1
}

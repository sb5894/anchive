import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { logger } from 'firebase-functions'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import ffmpegPath from 'ffmpeg-static'

initializeApp()

const db = getFirestore()

// events/{eventId}/posts/{postId}/{fileName} 형태만 다룬다 (src/lib/posts.js와 동일한 경로 규칙).
const VIDEO_PATH_RE = /^events\/([^/]+)\/posts\/([^/]+)\/([^/]+)$/

const POLL_DELAYS_MS = [2000, 4000, 8000, 16000, 30000] // postId 조회 재시도 간격, 합계 60초

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited with code ${code}: ${stderr.slice(-2000)}`))
    })
  })
}

// media[i].url은 getDownloadURL()이 만든 형식이라 실제 오브젝트 경로가
// 쿼리스트링 없는 /o/<encoded path> 구간에 그대로 들어 있다. 여기서 역으로 뽑아
// 트리거된 오브젝트(object.name)와 같은 항목인지 비교한다.
function objectPathFromDownloadUrl(url) {
  try {
    const u = new URL(url)
    const match = /\/o\/([^?]+)/.exec(u.pathname)
    return match ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

function buildDownloadUrl(bucketName, objectPath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`
}

// postId 문서가 아직 안 생겼을 수 있다 — createPost는 파일 업로드를 전부 끝낸
// "다음"에 Firestore 문서를 쓴다(src/lib/posts.js:71-93). 지수 백오프로 기다린다.
async function waitForPostDoc(postId) {
  const ref = db.collection('posts').doc(postId)
  for (const delay of POLL_DELAYS_MS) {
    const snap = await ref.get()
    if (snap.exists) return ref
    await sleep(delay)
  }
  const snap = await ref.get()
  return snap.exists ? ref : null
}

async function markMediaStatus(postId, objectPath, patch) {
  const ref = await waitForPostDoc(postId)
  if (!ref) {
    logger.error(`posts/${postId} 문서를 60초 안에 찾지 못해 media 상태를 갱신하지 못했습니다`, { objectPath })
    return
  }
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const media = snap.data().media || []
    let matched = false
    const nextMedia = media.map((m) => {
      if (objectPathFromDownloadUrl(m.url) !== objectPath) return m
      matched = true
      return { ...m, ...patch }
    })
    if (!matched) {
      logger.warn(`posts/${postId}.media에서 대응하는 항목을 찾지 못했습니다`, { objectPath })
      return
    }
    tx.update(ref, { media: nextMedia })
  })
}

export const transcodeVideo = onObjectFinalized(
  {
    region: 'asia-northeast3',
    memory: '2GiB',
    cpu: 2,
    timeoutSeconds: 540,
  },
  async (event) => {
    const object = event.data
    const objectName = object.name

    // 1) 대상이 아니면 즉시 종료 — 이 함수 자신이 만든 결과물(포스터, 변환된 mp4)이
    //    다시 이 함수를 트리거하지 않도록 막는 가드가 핵심이다. 없으면 무한 재귀로
    //    Storage/Functions 요금이 폭주한다.
    if (!object.contentType?.startsWith('video/')) return
    if (object.metadata?.transcoded === 'true') return

    const match = VIDEO_PATH_RE.exec(objectName)
    if (!match) return
    const [, , postId] = match

    const bucket = getStorage().bucket(object.bucket)
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'video-'))
    const inputExt = path.extname(objectName) || '.mp4'
    const inputPath = path.join(tmpDir, `in${inputExt}`)
    const outputPath = path.join(tmpDir, 'out.mp4')
    const posterPath = path.join(tmpDir, 'poster.jpg')

    try {
      logger.info(`영상 변환 시작: ${objectName}`)
      await bucket.file(objectName).download({ destination: inputPath })

      // -pix_fmt yuv420p가 핵심: iPhone HEVC 원본이 10-bit(yuv420p10le)인 경우
      // 이걸 빼면 H.264 High10 Profile로 인코딩되어 버려서, 지금 고치려는 것과
      // 똑같이 "특정 브라우저에서만 재생 안 됨" 문제가 재발한다.
      await runFfmpeg([
        '-y',
        '-i',
        inputPath,
        '-vf',
        "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
        '-c:v',
        'libx264',
        '-profile:v',
        'high',
        '-level',
        '4.0',
        '-preset',
        'veryfast',
        '-crf',
        '24',
        '-maxrate',
        '2500k',
        '-bufsize',
        '5000k',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ac',
        '2',
        '-movflags',
        '+faststart',
        outputPath,
      ])

      await runFfmpeg([
        '-y',
        '-i',
        outputPath,
        '-ss',
        '0.1',
        '-frames:v',
        '1',
        '-update',
        '1',
        '-vf',
        "scale='min(720,iw)':-2",
        posterPath,
      ])

      const dir = path.dirname(objectName)
      const base = path.basename(objectName, path.extname(objectName))
      const videoOutObjectPath = `${dir}/${base}_h264.mp4`
      const posterOutObjectPath = `${dir}/${base}_poster.jpg`

      const videoToken = randomUUID()
      const posterToken = randomUUID()

      const [videoBuf, posterBuf] = await Promise.all([readFile(outputPath), readFile(posterPath)])

      await Promise.all([
        bucket.file(videoOutObjectPath).save(videoBuf, {
          metadata: {
            contentType: 'video/mp4',
            cacheControl: 'public, max-age=31536000, immutable',
            metadata: { firebaseStorageDownloadTokens: videoToken, transcoded: 'true' },
          },
        }),
        bucket.file(posterOutObjectPath).save(posterBuf, {
          metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000, immutable',
            metadata: { firebaseStorageDownloadTokens: posterToken, transcoded: 'true' },
          },
        }),
      ])

      const videoUrl = buildDownloadUrl(object.bucket, videoOutObjectPath, videoToken)
      const posterUrl = buildDownloadUrl(object.bucket, posterOutObjectPath, posterToken)

      await markMediaStatus(postId, objectName, {
        url: videoUrl,
        type: 'video',
        poster: posterUrl,
        status: 'ready',
      })

      // Firestore 갱신이 성공한 뒤에만 원본을 지운다 — 실패했는데 먼저 지우면
      // media.url이 죽은 링크를 가리키게 된다.
      await bucket.file(objectName).delete().catch((err) => {
        logger.error(`원본 삭제 실패(치명적이지 않음): ${objectName}`, err)
      })

      logger.info(`영상 변환 완료: ${objectName} -> ${videoOutObjectPath}`)
    } catch (err) {
      logger.error(`영상 변환 실패: ${objectName}`, err)
      await markMediaStatus(postId, objectName, { status: 'failed' }).catch((markErr) => {
        logger.error(`실패 상태 기록도 실패: ${objectName}`, markErr)
      })
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
  }
)

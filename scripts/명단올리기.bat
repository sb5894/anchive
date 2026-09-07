@echo off
rem 명단(roster.csv)을 Firebase에 올리는 배치 파일. 더블클릭해서 실행한다.
rem
rem 이 파일은 scripts 폴더 안에 있으므로, 더블클릭하면 현재 폴더가 scripts가 된다.
rem node 스크립트에는 프로젝트 루트 기준 경로를 넘겨야 해서 %~dp0..(이 파일 위치의
rem 상위 폴더 = 프로젝트 루트)로 옮긴 뒤 실행한다.
rem
rem chcp 65001은 콘솔을 UTF-8로 바꿔 한글이 깨지지 않게 한다(이 파일도 UTF-8이다).

chcp 65001 > nul
cd /d "%~dp0.."

echo.
echo  =====================================
echo    안성초 추억지도 - 명단 올리기
echo  =====================================
echo.

if not exist "scripts\roster.csv" (
    echo  [문제] scripts 폴더에 roster.csv 파일이 없습니다.
    echo.
    echo  엑셀에서 "CSV UTF-8" 형식으로 저장하고
    echo  파일 이름을 roster.csv 로 해서 scripts 폴더에 넣어 주세요.
    goto finish
)

if not exist "serviceAccountKey.json" (
    echo  [문제] serviceAccountKey.json 파일이 없습니다.
    echo.
    echo  Firebase 콘솔 - 프로젝트 설정 - 서비스 계정 - 새 비공개 키 생성으로
    echo  받은 파일을 이 이름으로 프로젝트 폴더에 넣어 주세요.
    goto finish
)

echo  올릴 파일: scripts\roster.csv
echo.
echo  주의: 지금 올라가 있는 명단을 모두 지우고 이 파일 내용으로 바꿉니다.
echo.
set /p answer=  계속할까요? (y 를 누르고 엔터):

if /i not "%answer%"=="y" (
    echo.
    echo  취소했습니다. 아무것도 바뀌지 않았습니다.
    goto finish
)

echo.
node scripts\importRoster.mjs scripts\roster.csv

if errorlevel 1 (
    echo.
    echo  올리지 못했습니다. 위 내용을 확인하고 CSV를 고친 뒤 다시 실행해 주세요.
    goto finish
)

echo.
echo  다 됐습니다. 사이트에서 새로고침하면 바로 보입니다.
echo  (다시 배포할 필요는 없습니다)

:finish
echo.
pause

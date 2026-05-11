import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE_URL = 'file:///' + path.join(__dirname, 'shopping-list.html').replace(/\\/g, '/');

let passed = 0;
let failed = 0;

function log(emoji, msg) {
  console.log(`${emoji}  ${msg}`);
}

function assert(condition, testName) {
  if (condition) {
    log('✅', `PASS: ${testName}`);
    passed++;
  } else {
    log('❌', `FAIL: ${testName}`);
    failed++;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const page = await browser.newPage();

  await page.goto(FILE_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  console.log('\n🛒 쇼핑 리스트 앱 자동 테스트 시작\n' + '='.repeat(45));

  console.log('\n[ 테스트 1: 초기 상태 확인 ]');
  assert(await page.isVisible('#emptyMsg'), '빈 상태 메시지가 표시됨');
  assert(await page.textContent('#totalCount') === '총 0개', '초기 총 개수가 0개');
  assert(await page.textContent('#doneCount') === '완료 0개', '초기 완료 개수가 0개');

  console.log('\n[ 테스트 2: 아이템 추가 - 버튼 클릭 ]');
  await page.fill('#itemInput', '사과');
  await page.click('button:has-text("추가")');
  await page.waitForTimeout(200);
  assert(await page.locator('li').count() === 1, '아이템 1개 추가됨');
  assert(await page.isHidden('#emptyMsg'), '빈 상태 메시지가 숨겨짐');
  assert(await page.textContent('#totalCount') === '총 1개', '총 개수 1개로 업데이트');

  console.log('\n[ 테스트 3: 아이템 추가 - Enter 키 ]');
  await page.fill('#itemInput', '바나나'); await page.press('#itemInput', 'Enter'); await page.waitForTimeout(200);
  await page.fill('#itemInput', '우유');   await page.press('#itemInput', 'Enter'); await page.waitForTimeout(200);
  assert(await page.locator('li').count() === 3, 'Enter 키로 아이템 2개 추가 (총 3개)');
  assert(await page.textContent('#totalCount') === '총 3개', '총 개수 3개로 업데이트');

  console.log('\n[ 테스트 4: 빈 입력값 추가 방지 ]');
  await page.fill('#itemInput', '   '); await page.click('button:has-text("추가")'); await page.waitForTimeout(200);
  assert(await page.locator('li').count() === 3, '빈 입력 시 아이템 추가 안 됨 (여전히 3개)');

  console.log('\n[ 테스트 5: 아이템 체크 ]');
  const firstCheckbox = page.locator('li input[type="checkbox"]').first();
  await firstCheckbox.click(); await page.waitForTimeout(200);
  assert(await page.locator('li').first().evaluate(el => el.classList.contains('checked')), '체크 시 li에 checked 클래스 추가됨');
  assert(await page.textContent('#doneCount') === '완료 1개', '완료 개수 1개로 업데이트');
  assert(await page.isVisible('#clearBtn'), '"완료 항목 모두 삭제" 버튼 표시됨');

  console.log('\n[ 테스트 6: 아이템 체크 해제 ]');
  await firstCheckbox.click(); await page.waitForTimeout(200);
  assert(await page.locator('li').first().evaluate(el => !el.classList.contains('checked')), '체크 해제 시 checked 클래스 제거됨');
  assert(await page.textContent('#doneCount') === '완료 0개', '완료 개수 다시 0개');

  console.log('\n[ 테스트 7: 아이템 삭제 ]');
  await page.locator('li .delete-btn').first().click(); await page.waitForTimeout(200);
  assert(await page.locator('li').count() === 2, '삭제 후 아이템 2개 남음');
  assert(await page.textContent('#totalCount') === '총 2개', '총 개수 2개로 업데이트');

  console.log('\n[ 테스트 8: 완료 항목 일괄 삭제 ]');
  const checkboxes = page.locator('li input[type="checkbox"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i++) { await checkboxes.nth(i).click(); await page.waitForTimeout(150); }
  assert(await page.textContent('#doneCount') === `완료 ${count}개`, `모든 항목(${count}개) 체크됨`);
  await page.click('#clearBtn'); await page.waitForTimeout(200);
  assert(await page.locator('li').count() === 0, '완료 항목 일괄 삭제 후 0개');
  assert(await page.isVisible('#emptyMsg'), '빈 상태 메시지 다시 표시됨');

  console.log('\n[ 테스트 9: localStorage 데이터 유지 ]');
  await page.fill('#itemInput', '달걀'); await page.press('#itemInput', 'Enter'); await page.waitForTimeout(200);
  await page.reload(); await page.waitForTimeout(300);
  assert(await page.locator('li').count() === 1, '새로고침 후에도 데이터 유지됨');
  assert((await page.locator('li .item-text').first().textContent()).trim() === '달걀', '새로고침 후 아이템 내용 정확히 복원됨');

  console.log('\n' + '='.repeat(45));
  console.log(`\n📊 테스트 결과 요약`);
  console.log(`   ✅ 통과: ${passed}개`);
  console.log(`   ❌ 실패: ${failed}개`);
  console.log(`   📋 전체: ${passed + failed}개`);
  console.log(`\n${failed === 0 ? '🎉 모든 테스트 통과!' : '⚠️  일부 테스트 실패.'}\n`);

  await page.waitForTimeout(1500);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})();
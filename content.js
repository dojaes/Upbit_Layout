/* Upbit Layout Fixer
 * v1.0.0_b001 — 기준 버전(구 v2.5). 2행3열 배치, 뷰포트 중앙정렬, 10px 간격,
 *          1행/2행 높이 통일, 코인목록 sticky 무력화, transform 직접
 *          비교 기반 재적용(정규화 값 저장), 재적용 시 6개 패널 전부
 *          transform 초기화 후 재계산, isApplying 락
 * v1.0.0_b002 — window resize 이벤트 리스너 추가.
 * v1.0.0_b003 — naturalRect() 이중 보정 버그 수정 (간편주문/거래내역 전환 시
 *          레이아웃 붕괴 원인)
 * v1.0.0_b004 — 렌딩 광고 배너 패널(주문창 다음 형제 요소로 탐지) 추가.
 *          2열: 호가창→마켓뎁스→렌딩. 2행(체결/마켓뎁스/렌딩) 높이
 *          강제 동기화 제거, 1행(차트/호가창)만 유지
 * v1.0.0_b005 — 김프 정보패널 추가. document.body에 직접 붙여서 자체 텍스트
 *          갱신이 #UpbitLayout 재계산을 안 건드리게 함. 외부 API는
 *          background.js 경유(CSP 우회)
 * v1.0.0_b006 — 심볼 수동 override 표, 김프 이상치(±30%) N/A 처리(v1.2.0에서
 *          삭제됨), 패널 3열(주문창-코인목록 사이)로 이동, position
 *          absolute+스크롤 보정, 퍼센트/가격차 고정폭, 확장 재로드 시
 *          폴링 중단, MutationObserver 범위 document.body로 확장
 * v1.0.0_b007 — 가격대별 소수점 자릿수 고정 테이블(→v1.2.0에서 "가격차 값"
 *          기준으로 수정), 퍼센트 불투명도 100%, 가격차 괄호 제거, 2단
 *          스택 디자인(kimpga.com 참고), 코인 한글명 document.title 파싱
 * v1.0.0_b008 — 이상치 감지 삭제, 자릿수 기준을 가격차 값 기준으로 수정,
 *          코인명/김프%/가격차 글자크기·색상 전부 상수로 외부화, 클릭 시
 *          해당 거래소 선물 페이지 새 탭 이동, 테더 N/A 원인 확인(자기
 *          자신과 비교하는 심볼이라 원천적으로 안 됨)
 * v1.0.0_b009 — (폐기) 스테이블코인 전용 BTC 크로스레이트 방식,
 *          로고 파일명 변경 반영
 * v1.0.0_b010 — 전면 재설계.
 *          1) 김프 계산 기준을 "업비트 자체 USDT-KRW 시세"에서 실제
 *             원/달러 기준환율(background.js가 야후/두나무에서 받아옴)
 *             로 교체. 기존 방식은 업비트 자체 데이터로 분자/분모를 다
 *             만들다 보니 실제 프리미엄이 상쇄돼 항상 실제보다 작게
 *             나오는 문제가 있었음
 *          2) 공식 통일: 김프% = (업비트가 / (해외거래소 코인가 ×
 *             기준환율) - 1) × 100 — 모든 코인에 동일 적용
 *          3) 테더 등 스테이블코인은 "해외거래소 코인가"가 1로 고정된
 *             특수 케이스로 통합 처리 - 기존에 따로 있던 스테이블코인
 *             전용 렌더 함수/BTC 브릿지 fetch 전부 제거
 *          4) 코인 로고/이름 클릭 시 영문 티커(소문자)를 클립보드에
 *             복사하고 "{티커} 복사 완료" 토스트를 3초간 표시하는 기능
 *             추가
 * v1.0.0_b011 — background.js에서 기준환율 소스를 네이버(1순위)/두나무/야후
 *          순서로 시도하도록 변경, 우선순위 배열을 상단으로 빼서 순서
 *          조절 쉽게 함. 패널 우측에 업비트 테더가/기준환율 표시 블록
 *          추가(바이낸스 로고 오른쪽, 구분선 없이). 공식(calcForeignKrw/
 *          calcKimpPct/calcKimpDiff)을 파일 상단 함수로 분리
 * v1.0.0_b012 — 폭/로고크기/글자크기를 전부 고정 px 상수로 전환(기존엔 패널
 *          높이 비례 계산이라 조절 범위가 제한적이었음). 코인 로고/
 *          이름 클릭 시 영문 티커 클립보드 복사 + 토스트(1초) 기능,
 *          기준환율 시도 순서를 두나무→네이버→야후로 재조정
  * v1.0.0_b013 — 가로 리사이즈 시 김프패널이 안 움직이는 버그 수정. 진짜
 *          원인은 MutationObserver가 리사이즈 중에도 계속
 *          scheduleApply()를 force 없이 호출해서, 디바운스 타이머가
 *          우연히 force=false로 덮어써진 채 실행되는 경합 문제였음.
 *          force 요청을 pendingForce 플래그로 "들러붙게" 만들어 해결.
 *          추가로 드래그 도중에도 다른 패널들처럼 부드럽게 따라오도록
 *          무거운 전체 재계산과 별개로 가벼운 실시간 위치 추적
 *          (liveTrackKimpPosition) 추가. 기준환율 앞에 소스 표시
 *          원문자(ⓝ/ⓓ/ⓨ) 추가
 * v1.0.0_b014 — 업비트 테더가 앞에 ₮ 기호 추가, 코인명(한글/영문)이 칸
 *          폭보다 길 경우 말줄임 대신 다음 줄로 줄바꿈되게 변경
 * v1.0.0_b015 — 성능 개선: findPanels()가 article 전체를 정규식으로
 *          훑는 무거운 스캔인데, 기존엔 재계산 사이클마다(김프패널 위치
 *          계산 시 한 번 더 포함해 총 2번) 매번 다시 스캔하고 있었음.
 *          결과를 캐싱해두고, 캐싱된 요소가 실제로 DOM에서 떨어져
 *          나갔을 때만 재스캔하도록 변경(getPanels()/
 *          panelsStillAttached()). 평소엔 재스캔 자체가 거의 안 걸림
 * v1.0.0_b016 — 현물 마켓이 없는 코인(ZKP, DOS 등) 대응: background.js가
 *          현물 실패 시 선물/무기한스왑으로 자동 폴백. BEAM의 OKX
 *          override를 null로 변경(OKX엔 아직 미상장 확인됨)
 * v1.0.0_b017 — 김프%(pctEl) 클릭 → 현물 페이지, 가격차(diffEl) 클릭 →
 *          선물 페이지로 각각 다르게 연결되도록 변경(기존엔 퍼센트/
 *          가격차 구분 없이 통째로 선물로만 연결됐음). coinChanged
 *          플래그로 코인 바뀐 시점을 background.js에 알려줘서, 현물/
 *          선물 동시조회는 코인 바뀔 때만 하고 이후 폴링은 결정된
 *          한쪽만 조회(부하 최적화)
 * v1.0.0_b018 — 비트겟(Bitget) 거래소 추가. 바이낸스/OKX와 동일한 구조로
 *          OKX 오른쪽에 배치. 로고 파일명: logo_Bitget.svg
 * v1.0.0_b019 — 바이낸스 로고 ↔ 테더가/기준환율(info) 블록 위치 교체.
 *          마커 표시 방식 변경: 김프%(pctEl) 뒤엔 현물 링크 존재 시
 *          ⓢ, 가격차(diffEl) 뒤엔 선물 링크 존재 시 ⓟ를 각각 독립적으로
 *          표시(계산에 뭘 썼는지와 무관하게 "그 마켓 링크가 있는지"만
 *          시각적으로 바로 확인 가능하게)
 * v1.0.0_b020 — 퍼센트/가격차에 마우스 오버 시 실제 연결될 URL을 title
 *          툴팁으로 표시(클릭 전에 어디로 연결되는지 확인 가능,
 *          SNT처럼 예상과 다른 심볼로 연결되는 문제 진단용으로도 활용)
 * v1.0.0_b021 — 종합 기능 추가
 *          1) 현물 없고 선물만 있는 경우 김프%(pctEl)에도 마커 표시(기존
 *             엔 현물 있을 때만 표시했음, 링크는 안 걸음 - 이미 가격차
 *             쪽에 선물 링크가 있어서). 폭 상수(KIMP_NAME_WIDTH=100,
 *             KIMP_VAL_WIDTH_*=50, KIMP_INFO_WIDTH=25, KIMP_GROUP_GAP=1)
 *             사용자 조절값 반영
 *          2) 온오프 토글 스위치 추가(24px, logo_On.svg/logo_Off.svg).
 *             chrome.storage.local에 상태 저장해서 새로고침해도 유지됨
 *             (manifest.json에 storage 권한 추가)
 *          3) 업비트가 메뉴 이동 시 새로고침 없는 SPA라서, 거래소
 *             페이지가 아니면 김프패널을 숨기도록 변경(기존엔 다른
 *             메뉴 가도 계속 떠 있었음). 페이지 판단은 처음엔
 *             #UpbitLayout 존재 여부로 했으나, 업비트가 다른 메뉴에서도
 *             이 요소를 DOM에서 안 지우는 것으로 확인되어 URL 경로
 *             (location.pathname.startsWith('/exchange')) 기준으로 교체
 *          4) 꺼짐 상태에서는 MutationObserver.disconnect()+김프 폴링
 *             setInterval 완전 정지로 원본 사이트 대비 추가 부하 없게
 *             만듦. 끌 때 6패널 스타일(transform/height/width)도 전부
 *             원본 상태로 초기화
 *          5) (버그 수정) 패널을 다시 보이게 할 때 style.display를
 *             빈 문자열로 초기화하면 생성 시 줬던 'flex' 선언이
 *             지워져서 div 기본값인 'block'으로 떨어져 내부 요소가
 *             가로가 아니라 세로로 쌓이는 버그가 있었음 - 'flex'로
 *             명시하도록 수정
 *          6) 토글 스위치는 거래소 페이지 한정 없이 모든 페이지에서
 *             항상 표시. 위치는 1열 시작 X좌표(xCol1)에 맞춰 레이아웃
 *             재계산할 때마다 같이 갱신, 상단에서 5px 고정. 마커 문자를
 *             ⓢ/ⓟ에서 Ⓢ/Ⓟ로 변경
 * v1.0.0_b022 — 기준환율 소스 표시 원문자 변경(소문자 ⓝ/ⓓ/ⓨ →
 *          대문자 Ⓝ/Ⓓ/Ⓨ). 두나무(ⓓ) 소스가 다음(Daum)으로 교체됨에
 *          따라 표시 문자도 다음 기준의 Ⓓ로 유지. biquote 소스 추가에
 *          맞춰 Ⓑ 신규 등록
 * v1.0.0_b023 — (버그 수정) 창을 우리 확장 전체 폭보다 좁게 줄이면
 *          중앙정렬 공식(startX)이 음수가 되는데, transform은 스크롤
 *          가능 영역을 넓히지 않아 그만큼 왼쪽으로 밀려난 부분이 영영
 *          스크롤로 닿을 수 없는 영역이 되는 문제였음(온오프 버튼도
 *          이 좌표를 그대로 써서 화면 밖으로 사라짐) - startX를 0으로
 *          클램프해서 항상 왼쪽 원점에서 시작하도록 수정. 온오프 토글
 *          위치 기준을 중앙정렬 좌표 대신 rChart(업비트 원본/미변형
 *          위치)로 변경, 좌측 10px/최상단 10px 고정(기존 5px/5px에서
 *          변경). KIMP_VAL_WIDTH_BINANCE/OKX/BITGET 50→55 재수정
 */
(()=>{

  const DEBOUNCE_MS=150;
  const GAP=10;
  const KIMP_POLL_MS=1000;

  // ── 김프패널 직접 조절용 (전부 여기서 수정) ─────────────────
  const KIMP_BG_COLOR='#F5F9FF';

  // 폭 (px) - 구역별로 각각 따로 조절 가능
  const KIMP_NAME_WIDTH=100;        // 코인명(로고+한글/영문) 블록 폭
  const KIMP_VAL_WIDTH_BINANCE=55;  // 바이낸스 퍼센트/가격차 칸 폭
  const KIMP_VAL_WIDTH_OKX=55;      // OKX 퍼센트/가격차 칸 폭
  const KIMP_VAL_WIDTH_BITGET=55;   // 비트겟 퍼센트/가격차 칸 폭
  const KIMP_INFO_WIDTH=25;         // 업비트 테더가/기준환율 블록 폭
  const KIMP_GROUP_GAP=1;           // 그룹 사이(구분선 포함) 여백

  // 로고 크기 (px)
  const KIMP_COIN_LOGO_SIZE=24;     // 코인 자체 로고
  const KIMP_EXCHANGE_LOGO_SIZE=18; // 바이낸스/OKX 로고

  // 글자 크기 (px) - 패널 높이와 무관하게 고정
  const KIMP_NAME_KR_FONT_SIZE=11;   // 한글명
  const KIMP_NAME_EN_FONT_SIZE=10;   // 영문티커
  const KIMP_PCT_FONT_SIZE=11;       // 김프%
  const KIMP_DIFF_FONT_SIZE=10;      // 가격차
  const KIMP_USDT_FONT_SIZE=11;      // 업비트 테더가
  const KIMP_BASERATE_FONT_SIZE=10;  // 기준환율

  const KIMP_USDT_COLOR='#000000';     // 업비트 테더(USDT)가 색상
  const KIMP_BASERATE_COLOR='#131722'; // 기준환율 색상

  const KIMP_NAME_KR_COLOR='#000000';
  const KIMP_NAME_EN_COLOR='#666666';
  const KIMP_PCT_POS_COLOR='#26a69a';  // 김프 양수
  const KIMP_PCT_NEG_COLOR='#ef5350';  // 김프 음수
  const KIMP_PCT_ZERO_COLOR='#000000'; // 김프 0 또는 N/A
  const KIMP_DIFF_COLOR='#000000';     // 가격차 색상(양/음 구분 없음)


  // ── 김프 계산 공식 (수정하고 싶으면 여기만 건드리면 됨) ──────
  // foreignCoinPrice: 해외거래소 코인가(USDT 기준), baseRate: 기준환율(원/달러)
  function calcForeignKrw(foreignCoinPrice,baseRate){
    return foreignCoinPrice*baseRate;
  }
  function calcKimpPct(upbitPrice,foreignKrw){
    return (upbitPrice/foreignKrw-1)*100;
  }
  function calcKimpDiff(upbitPrice,foreignKrw){
    return upbitPrice-foreignKrw;
  }

  // 업비트 티커: { binance: 실제 바이낸스 심볼, okx: 실제 OKX instId, bitget: 실제 비트겟 심볼(없으면 null) }
  // 자동 매칭(코인+'USDT')이 틀린 게 발견되면 여기에 한 줄씩 추가.
  // 현물이 아예 없는 코인(예: ZKP, DOS)은 여기 손댈 필요 없음 -
  // background.js가 자동으로 선물/스왑으로 폴백함(ⓟ 표시로 구분됨).
  // 해당 거래소에 코인 자체가 아예 없으면(현물/선물 둘 다 없음) null
  const SYMBOL_OVERRIDES={
    'BEAM': { binance:'BEAMXUSDT', okx:null }, // OKX엔 아직 미상장
  };

  // 스테이블코인은 해외거래소 가격이 사실상 항상 1(USDT 기준)로 취급 -
  // 바이낸스/OKX API 호출 자체를 생략하고 1을 그대로 씀
  const STABLE_COINS=['USDT','USDC','DAI'];

  // 기준환율 앞에 붙는 소스 표시 원문자
  const BASE_RATE_SOURCE_MARK={
    naver:   'Ⓝ',
    daum:    'Ⓓ',
    yahoo:   'Ⓨ',
    biquote: 'Ⓑ',
  };

  let debounceTimer=null;
  let observer=null;
  let isApplying=false;
  let cachedPanels=null; // findPanels() 결과 캐시. 매 사이클 재스캔 방지용

  // ── 온오프 토글 ──────────────────────────────────────────────
  let layoutEnabled=true;   // chrome.storage.local에 저장/복원됨
  let isActive=false;       // 지금 observer/폴링이 실제로 돌고 있는지
  let toggleEl=null;

  function isExchangePage(){
    return location.pathname.startsWith('/exchange');
  }

  // ── 6패널 + 렌딩 탐지/배치 ──────────────────────────────────

  function findPanels(){
    const R=document.querySelector('#UpbitLayout');
    if(!R) return null;

    const A=[...R.querySelectorAll('article')];

    const f=s=>A.find(e=>
      (e.innerText||'')
        .replace(/\s+/g,' ')
        .match(s)
      &&
      e.getBoundingClientRect().width>300
    );

    const chart       = f(/시세.*정보/);
    const orderbook    = f(/일반호가.*누적호가/);
    const orderWindow  = f(/매수.*매도.*거래내역/);
    const trade        = f(/^체결.*일별/);
    const depth        = f(/^마켓뎁스.*미니차트/);
    const coinList     = f(/원화.*BTC.*USDT.*보유.*관심/);

    const P=[chart,orderbook,orderWindow,trade,depth,coinList];

    if(P.some(e=>!e)) return null;

    const lending = orderWindow.nextElementSibling;
    if(!lending) return null;

    return {R,chart,orderbook,orderWindow,trade,depth,coinList,lending};
  }

  // findPanels()는 article 전체를 정규식으로 훑는 무거운 스캔이라,
  // 캐싱해뒀다가 캐싱된 요소들이 실제로 DOM에서 떨어져나갔을 때만
  // 다시 스캔함(평소엔 재스캔 자체가 거의 안 걸림)
  function panelsStillAttached(p){
    if(!p) return false;
    return document.body.contains(p.chart)
      && document.body.contains(p.orderbook)
      && document.body.contains(p.orderWindow)
      && document.body.contains(p.trade)
      && document.body.contains(p.depth)
      && document.body.contains(p.coinList)
      && document.body.contains(p.lending);
  }

  function getPanels(){
    if(panelsStillAttached(cachedPanels)) return cachedPanels;
    const found=findPanels();
    if(found) cachedPanels=found;
    return found;
  }

  function setStyleIfChanged(el,prop,value){
    if(el.style[prop]!==value){
      el.style[prop]=value;
    }
  }

  function naturalRect(el){
    const r=el.getBoundingClientRect();
    return {
      left:Math.round(r.left),
      top:Math.round(r.top),
      width:Math.round(r.width),
      height:Math.round(r.height),
    };
  }

  function neutralizeSticky(coinList,root){
    let el=coinList;
    while(el && el!==root && el!==document.body){
      const pos=getComputedStyle(el).position;
      if(pos==='sticky'||pos==='fixed'){
        if(el.style.getPropertyValue('position')!=='static'){
          el.style.setProperty('position','static','important');
        }
      }
      el=el.parentElement;
    }
  }

  // ── 김프 정보패널 ────────────────────────────────────────────

  let kimpPanelEl=null;
  let lastKnownOrderWindow=null; // 리사이즈 드래그 중 실시간 추적용
  let liveTrackScheduled=false;
  let copyToastTimeout=null;

  function resolveSymbols(coin){
    if(STABLE_COINS.includes(coin)){
      return { binance:null, okx:null, bitget:null };
    }
    const ov=SYMBOL_OVERRIDES[coin];
    if(ov){
      return {
        binance: ov.binance,
        okx: ov.okx,
        bitget: (ov.bitget!==undefined ? ov.bitget : `${coin}USDT`),
      };
    }
    return { binance: `${coin}USDT`, okx: `${coin}-USDT`, bitget: `${coin}USDT` };
  }

  // 가격대별 소수점 자릿수 (kimpga류 사이트 캡처 분석 기반).
  // 가격차(diff) 값 자체에 적용함
  function decimalsForValue(value){
    const abs=Math.abs(value);
    if(abs>=1000) return 0;
    if(abs>=100)  return 1;
    if(abs>=10)   return 2;
    if(abs>=1)    return 3;
    if(abs>=0.01) return 4; // 0.01~0.0999 구간은 실측 샘플 없어 추정
    if(abs>=0.001) return 5;
    if(abs>=0.0001) return 6;
    let decimals=6;
    let bound=0.0001;
    while(abs<bound && decimals<12){
      decimals++;
      bound/=10;
    }
    return decimals;
  }

  function getCoinKoreanName(){
    const parts=document.title.split('|');
    if(parts.length>=2) return parts[1].trim();
    return '';
  }

  function getOrCreateKimpPanel(){
    if(kimpPanelEl && document.body.contains(kimpPanelEl)) return kimpPanelEl;

    const el=document.createElement('div');
    el.id='ub-kimp-panel';
    el.style.position='absolute';
    el.style.zIndex='20';
    el.style.background=KIMP_BG_COLOR;
    el.style.color='#000000';
    el.style.display='flex';
    el.style.alignItems='center';
    el.style.boxSizing='border-box';
    el.style.whiteSpace='nowrap';
    el.style.padding='0 10px';
    el.style.gap='10px';

    el.innerHTML=`
      <img class="ub-kimp-coin-logo" style="width:${KIMP_COIN_LOGO_SIZE}px;height:${KIMP_COIN_LOGO_SIZE}px;flex-shrink:0;object-fit:contain;cursor:pointer;" onerror="this.style.display='none'">
      <div class="ub-kimp-name" style="display:flex;flex-direction:column;justify-content:center;flex-shrink:0;line-height:1.25;width:${KIMP_NAME_WIDTH}px;cursor:pointer;">
        <span class="ub-kimp-name-kr" style="font-weight:700;font-size:${KIMP_NAME_KR_FONT_SIZE}px;white-space:normal;word-break:break-word;display:block;color:${KIMP_NAME_KR_COLOR};"></span>
        <span class="ub-kimp-name-en" style="font-size:${KIMP_NAME_EN_FONT_SIZE}px;white-space:normal;word-break:break-word;display:block;color:${KIMP_NAME_EN_COLOR};"></span>
      </div>
      <div class="ub-kimp-info" style="display:flex;flex-direction:column;justify-content:center;align-items:flex-end;width:${KIMP_INFO_WIDTH}px;flex-shrink:0;line-height:1.25;font-variant-numeric:tabular-nums;">
        <span class="ub-kimp-usdt" style="font-weight:700;font-size:${KIMP_USDT_FONT_SIZE}px;color:${KIMP_USDT_COLOR};"></span>
        <span class="ub-kimp-baserate" style="font-size:${KIMP_BASERATE_FONT_SIZE}px;color:${KIMP_BASERATE_COLOR};"></span>
      </div>
      <img class="ub-kimp-logo" src="${chrome.runtime.getURL('logo_Binance.svg')}" style="width:${KIMP_EXCHANGE_LOGO_SIZE}px;height:${KIMP_EXCHANGE_LOGO_SIZE}px;flex-shrink:0;">
      <div class="ub-kimp-vals" data-x="binance" style="display:flex;flex-direction:column;justify-content:center;align-items:flex-end;width:${KIMP_VAL_WIDTH_BINANCE}px;flex-shrink:0;line-height:1.25;font-variant-numeric:tabular-nums;">
        <span class="ub-kimp-pct" data-x="binance" style="font-weight:700;font-size:${KIMP_PCT_FONT_SIZE}px;"></span>
        <span class="ub-kimp-diff" data-x="binance" style="font-size:${KIMP_DIFF_FONT_SIZE}px;color:${KIMP_DIFF_COLOR};"></span>
      </div>
      <div class="ub-kimp-divider" style="width:1px;align-self:stretch;background:rgba(0,0,0,.15);flex-shrink:0;margin:6px ${Math.round(KIMP_GROUP_GAP/2)}px;"></div>
      <img class="ub-kimp-logo" src="${chrome.runtime.getURL('logo_Okx.svg')}" style="width:${KIMP_EXCHANGE_LOGO_SIZE}px;height:${KIMP_EXCHANGE_LOGO_SIZE}px;flex-shrink:0;">
      <div class="ub-kimp-vals" data-x="okx" style="display:flex;flex-direction:column;justify-content:center;align-items:flex-end;width:${KIMP_VAL_WIDTH_OKX}px;flex-shrink:0;line-height:1.25;font-variant-numeric:tabular-nums;">
        <span class="ub-kimp-pct" data-x="okx" style="font-weight:700;font-size:${KIMP_PCT_FONT_SIZE}px;"></span>
        <span class="ub-kimp-diff" data-x="okx" style="font-size:${KIMP_DIFF_FONT_SIZE}px;color:${KIMP_DIFF_COLOR};"></span>
      </div>
      <div class="ub-kimp-divider" style="width:1px;align-self:stretch;background:rgba(0,0,0,.15);flex-shrink:0;margin:6px ${Math.round(KIMP_GROUP_GAP/2)}px;"></div>
      <img class="ub-kimp-logo" src="${chrome.runtime.getURL('logo_Bitget.svg')}" style="width:${KIMP_EXCHANGE_LOGO_SIZE}px;height:${KIMP_EXCHANGE_LOGO_SIZE}px;flex-shrink:0;">
      <div class="ub-kimp-vals" data-x="bitget" style="display:flex;flex-direction:column;justify-content:center;align-items:flex-end;width:${KIMP_VAL_WIDTH_BITGET}px;flex-shrink:0;line-height:1.25;font-variant-numeric:tabular-nums;">
        <span class="ub-kimp-pct" data-x="bitget" style="font-weight:700;font-size:${KIMP_PCT_FONT_SIZE}px;"></span>
        <span class="ub-kimp-diff" data-x="bitget" style="font-size:${KIMP_DIFF_FONT_SIZE}px;color:${KIMP_DIFF_COLOR};"></span>
      </div>
    `;

    el.addEventListener('click',(e)=>{
      // 로고/코인명 클릭 → 영문 티커 클립보드 복사
      const nameArea=e.target.closest('.ub-kimp-coin-logo,.ub-kimp-name');
      if(nameArea){
        const coin=el.dataset.currentCoin;
        if(coin) copyTickerToClipboard(coin);
        return;
      }
      // 김프% 클릭 → 현물 페이지, 가격차 클릭 → 선물 페이지 (각각 새 탭)
      const target=e.target.closest('.ub-kimp-pct,.ub-kimp-diff');
      if(target){
        const url=target.dataset.linkUrl;
        if(url) window.open(url,'_blank','noopener');
      }
    });

    document.body.appendChild(el);
    kimpPanelEl=el;
    return el;
  }

  function copyTickerToClipboard(coin){
    const text=coin.toLowerCase();
    const done=()=>showCopyToast(text);

    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(done).catch(()=>{
        fallbackCopy(text);
        done();
      });
    }else{
      fallbackCopy(text);
      done();
    }
  }

  function fallbackCopy(text){
    const ta=document.createElement('textarea');
    ta.value=text;
    ta.style.position='fixed';
    ta.style.opacity='0';
    document.body.appendChild(ta);
    ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
  }

  function showCopyToast(text){
    const el=kimpPanelEl;
    if(!el) return;

    let toast=el.querySelector('.ub-kimp-copy-toast');
    if(!toast){
      toast=document.createElement('div');
      toast.className='ub-kimp-copy-toast';
      toast.style.position='absolute';
      toast.style.left='0';
      toast.style.top='-30px';
      toast.style.background='#333333';
      toast.style.color='#ffffff';
      toast.style.padding='4px 10px';
      toast.style.borderRadius='4px';
      toast.style.fontSize='12px';
      toast.style.whiteSpace='nowrap';
      toast.style.zIndex='30';
      toast.style.transition='opacity .2s';
      toast.style.pointerEvents='none';
      el.appendChild(toast);
    }

    toast.textContent=`${text} 복사 완료`;
    toast.style.opacity='1';
    toast.style.display='block';

    clearTimeout(copyToastTimeout);
    copyToastTimeout=setTimeout(()=>{
      toast.style.opacity='0';
    },1000);
  }

  // ── 저장/복원 ────────────────────────────────────────────────
  function loadEnabledState(cb){
    try{
      chrome.storage.local.get(['ub_layout_enabled'],(r)=>{
        layoutEnabled=(r && r.ub_layout_enabled===false) ? false : true;
        cb&&cb();
      });
    }catch(e){
      layoutEnabled=true;
      cb&&cb();
    }
  }

  function saveEnabledState(){
    try{ chrome.storage.local.set({ub_layout_enabled:layoutEnabled}); }catch(e){}
  }

  // ── 토글 스위치 (업비트 원본 시작점 좌측 10px / 최상단 10px) ──
  function updateToggleIcon(){
    if(!toggleEl) return;
    // 켜져있으면 Off 아이콘(누르면 끔), 꺼져있으면 On 아이콘(누르면 켬)
    const src=chrome.runtime.getURL(layoutEnabled ? 'logo_Off.svg' : 'logo_On.svg');
    if(toggleEl.src!==src) toggleEl.src=src;
  }

  function getOrCreateToggle(){
    if(toggleEl && document.body.contains(toggleEl)) return toggleEl;

    const img=document.createElement('img');
    img.id='ub-toggle-switch';
    img.style.position='fixed';
    img.style.left='10px';
    img.style.top='10px';
    img.style.width='24px';
    img.style.height='24px';
    img.style.zIndex='2147483647';
    img.style.cursor='pointer';

    img.addEventListener('click',()=>{
      layoutEnabled=!layoutEnabled;
      saveEnabledState();
      updateToggleIcon();
      if(layoutEnabled){
        activateLayout();
        if(kimpPanelEl) kimpPanelEl.style.display='flex';
      }else{
        deactivateLayout();
      }
    });

    document.body.appendChild(img);
    toggleEl=img;
    updateToggleIcon();
    return img;
  }

  // 토글은 position:fixed라 스크롤과 무관하게 항상 뷰포트 기준으로
  // 붙어야 하므로 scrollX 보정 없이 그대로 x좌표만 반영. x는 "업비트
  // 원본(미변형) 시작 위치"에서 10px 뺀 값을 넘겨받음 - 창을 좁힐 때
  // 우리 확장이 계산하는 중앙정렬 좌표(startX)를 기준으로 삼으면 그
  // 값이 음수가 될 수 있어(전체 폭이 뷰포트보다 넓어지는 경우) 토글이
  // 화면 밖(왼쪽)으로 밀려나 안 보이는 문제가 있었음. 업비트 자체
  // 레이아웃이 반환하는 원본 좌표는 항상 뷰포트 안쪽이므로 그걸 기준
  // 으로 삼으면 리사이즈해도 토글이 항상 눈에 보이는 위치에 고정됨
  function positionToggle(x){
    if(!toggleEl) return;
    setStyleIfChanged(toggleEl,'left',`${Math.round(x)}px`);
  }

  // ── 원본 상태로 되돌리기 (끄기 시 사용) ──────────────────────
  function resetPanelStyles(){
    const found=cachedPanels;
    if(!found) return;
    const list=[found.chart,found.orderbook,found.orderWindow,found.trade,found.depth,found.coinList,found.lending];
    list.forEach(e=>{
      if(!document.body.contains(e)) return;
      setStyleIfChanged(e,'transform','');
      delete e.dataset.ubTransform;
    });
    if(document.body.contains(found.chart)){
      setStyleIfChanged(found.chart,'height','');
      setStyleIfChanged(found.chart,'minHeight','');
    }
    if(document.body.contains(found.orderbook)){
      setStyleIfChanged(found.orderbook,'height','');
      setStyleIfChanged(found.orderbook,'minHeight','');
    }
    if(document.body.contains(found.coinList)){
      setStyleIfChanged(found.coinList,'width','');
      setStyleIfChanged(found.coinList,'minWidth','');
    }
  }

  // ── 켜기/끄기 ────────────────────────────────────────────────
  function activateLayout(){
    if(isActive) return;
    isActive=true;

    if(!observer){
      observer=new MutationObserver((mutations)=>{
        // 김프패널 자체의 텍스트 갱신은 재계산 트리거에서 제외
        const relevant=mutations.some(m=>
          !kimpPanelEl || !kimpPanelEl.contains(m.target)
        );
        if(relevant) scheduleApply();
      });
    }
    // #UpbitLayout 바깥(형제 위치)에 삽입되는 배너 등도 감지하기 위해
    // document.body 전체를 감시 범위로 확장
    observer.observe(document.body,{
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:['style']
    });

    applyLayout(true);

    if(!kimpIntervalId){
      kimpIntervalId=setInterval(pollKimpData,KIMP_POLL_MS);
      pollKimpData();
    }
  }

  function deactivateLayout(){
    if(!isActive) return;
    isActive=false;

    if(observer) observer.disconnect();

    if(kimpIntervalId){
      clearInterval(kimpIntervalId);
      kimpIntervalId=null;
    }

    if(kimpPanelEl) kimpPanelEl.style.display='none';

    resetPanelStyles();
  }

  function positionKimpPanel(el,x,y,width,height){
    const absX=x+window.scrollX;
    const absY=y+window.scrollY;
    setStyleIfChanged(el,'left',`${absX}px`);
    setStyleIfChanged(el,'top',`${absY}px`);
    setStyleIfChanged(el,'width',`${width}px`);
    setStyleIfChanged(el,'height',`${height}px`);
    // 글자/로고 크기는 이제 고정 px 상수라 생성 시 한 번만 적용되고
    // 여기서 매번 다시 계산할 필요 없음(패널 높이와 무관)
  }

  // 리사이즈 드래그 도중에도 무거운 전체 재계산(디바운스로 미뤄짐)을
  // 기다리지 않고, 주문창의 "현재" 위치만 가볍게 따라가서 다른
  // 패널들처럼 실시간으로 움직이는 것처럼 보이게 함. 폭/높이 같은
  // 무거운 계산은 그대로 드래그 끝난 뒤 applyLayout에서 정리됨
  function liveTrackKimpPosition(){
    if(liveTrackScheduled) return;
    liveTrackScheduled=true;
    requestAnimationFrame(()=>{
      liveTrackScheduled=false;
      if(!lastKnownOrderWindow || !kimpPanelEl) return;
      if(!document.body.contains(lastKnownOrderWindow)) return;

      const r=lastKnownOrderWindow.getBoundingClientRect();
      const x=Math.round(r.left);
      const y=Math.round(r.bottom)+GAP;
      const absX=x+window.scrollX;
      const absY=y+window.scrollY;
      setStyleIfChanged(kimpPanelEl,'left',`${absX}px`);
      setStyleIfChanged(kimpPanelEl,'top',`${absY}px`);
    });
  }

  function formatDiff(diff,decimals){
    const sign=diff<0?'-':'+';
    const abs=Math.abs(diff);
    const fixed=abs.toFixed(decimals);
    const [intPart,decPart]=fixed.split('.');
    const withComma=intPart.replace(/\B(?=(\d{3})+(?!\d))/g,',');
    return decimals>0 ? `${sign}${withComma}.${decPart}` : `${sign}${withComma}`;
  }

  function formatPct(pct){
    const sign=pct>0?'+':'';
    return `${sign}${pct.toFixed(2)}%`;
  }

  // 부호 없이 콤마+자릿수만 적용하는 일반 숫자 포맷(업비트 테더가/기준환율용)
  function formatPlain(value){
    const decimals=decimalsForValue(value);
    const fixed=Math.abs(value).toFixed(decimals);
    const [intPart,decPart]=fixed.split('.');
    const withComma=intPart.replace(/\B(?=(\d{3})+(?!\d))/g,',');
    return decimals>0 ? `${withComma}.${decPart}` : withComma;
  }

  function buildSpotUrl(prefix,coin,exchangeSymbol){
    if(prefix==='binance'){
      const base=exchangeSymbol.replace(/USDT$/,'');
      return `https://www.binance.com/en/trade/${base}_USDT`;
    }
    if(prefix==='okx'){
      return `https://www.okx.com/trade-spot/${coin.toLowerCase()}-usdt`;
    }
    // bitget
    return `https://www.bitget.com/spot/${exchangeSymbol}`;
  }

  function buildFuturesUrl(prefix,coin,exchangeSymbol){
    if(prefix==='binance'){
      return `https://www.binance.com/en/futures/${exchangeSymbol}`;
    }
    if(prefix==='okx'){
      return `https://www.okx.com/trade-swap/${coin.toLowerCase()}-usdt-swap`;
    }
    // bitget
    return `https://www.bitget.com/futures/usdt/${exchangeSymbol}`;
  }

  // 김프% = (업비트가 / (해외거래소 코인가 × 기준환율) - 1) × 100
  // hasSpot/hasFutures: 코인 바뀔 때 한 번 확인해둔 각 마켓 존재 여부.
  // 계산엔 현물이 있으면 현물, 없으면 선물 가격이 이미 반영된
  // foreignCoinPrice가 들어옴(background.js에서 결정)
  function renderKimpSide(prefix,coin,exchangeSymbol,upbitPrice,foreignCoinPrice,baseRate,isStable,hasSpot,hasFutures){
    const el=kimpPanelEl;
    if(!el) return;

    const pctEl=el.querySelector(`.ub-kimp-pct[data-x="${prefix}"]`);
    const diffEl=el.querySelector(`.ub-kimp-diff[data-x="${prefix}"]`);
    if(!pctEl||!diffEl) return;

    const effectiveForeignPrice=isStable ? 1 : foreignCoinPrice;
    // 링크 있는지 눈으로 바로 확인할 수 있게: 현물 있으면 김프%에 ⓢ,
    // 현물 없고 선물만 있으면 김프%에 ⓟ(계산도 이 경우 선물가 기준).
    // 가격차 쪽은 선물 링크 있으면 항상 ⓟ
    const spotMark=(!isStable && hasSpot) ? 'Ⓢ' : ((!isStable && !hasSpot && hasFutures) ? 'Ⓟ' : '');
    const futuresMark=(!isStable && hasFutures) ? 'Ⓟ' : '';

    if(effectiveForeignPrice==null || upbitPrice==null || baseRate==null){
      pctEl.textContent='N/A';
      pctEl.style.color=KIMP_PCT_ZERO_COLOR;
      diffEl.textContent='';
      pctEl.dataset.linkUrl='';
      diffEl.dataset.linkUrl='';
      pctEl.style.cursor='default';
      diffEl.style.cursor='default';
      pctEl.title='';
      diffEl.title='';
      return;
    }

    const foreignKrw=calcForeignKrw(effectiveForeignPrice,baseRate);
    const diff=calcKimpDiff(upbitPrice,foreignKrw);
    const pct=calcKimpPct(upbitPrice,foreignKrw);
    const decimals=decimalsForValue(diff);

    pctEl.textContent=formatPct(pct)+spotMark;
    diffEl.textContent=formatDiff(diff,decimals)+futuresMark;

    if(pct>0){
      pctEl.style.color=KIMP_PCT_POS_COLOR;
    }else if(pct<0){
      pctEl.style.color=KIMP_PCT_NEG_COLOR;
    }else{
      pctEl.style.color=KIMP_PCT_ZERO_COLOR;
    }

    // 김프%(pctEl) 클릭 → 현물, 가격차(diffEl) 클릭 → 선물.
    // 테더 등 스테이블코인, 또는 해당 마켓이 아예 없으면 링크 비활성.
    // title(마우스 오버 시 표시되는 툴팁)에 실제 연결될 URL을 그대로
    // 보여줘서, 어디로 연결되는지 클릭 전에 눈으로 바로 확인 가능
    if(!isStable && hasSpot){
      const spotUrl=buildSpotUrl(prefix,coin,exchangeSymbol);
      pctEl.dataset.linkUrl=spotUrl;
      pctEl.style.cursor='pointer';
      pctEl.title=spotUrl;
    }else{
      pctEl.dataset.linkUrl='';
      pctEl.style.cursor='default';
      pctEl.title='';
    }

    if(!isStable && hasFutures){
      const futuresUrl=buildFuturesUrl(prefix,coin,exchangeSymbol);
      diffEl.dataset.linkUrl=futuresUrl;
      diffEl.style.cursor='pointer';
      diffEl.title=futuresUrl;
    }else{
      diffEl.dataset.linkUrl='';
      diffEl.style.cursor='default';
      diffEl.title='';
    }
  }

  function getCurrentCoin(){
    const params=new URLSearchParams(location.search);
    const code=params.get('code'); // 예: CRIX.UPBIT.KRW-BTC
    if(!code) return null;
    const market=code.split('.').pop(); // KRW-BTC
    const parts=market.split('-');
    if(parts.length!==2) return null;
    return parts[1]; // BTC
  }

  let kimpPolling=false;
  let kimpIntervalId=null;
  let lastPolledCoin=null; // 코인 바뀜 감지용 (background에 coinChanged로 알려줌)

  function pollKimpData(){
    if(!layoutEnabled) return;

    if(!chrome.runtime || !chrome.runtime.id){
      // 확장이 새로고침/제거되어 이 content script와의 연결이 끊긴 상태.
      // 계속 시도해봐야 매번 에러만 나므로 폴링 자체를 중단(페이지
      // 새로고침해야 정상화됨)
      if(kimpIntervalId){
        clearInterval(kimpIntervalId);
        kimpIntervalId=null;
      }
      return;
    }

    if(kimpPolling) return;
    const coin=getCurrentCoin();
    if(!coin) return;

    const coinChanged=(coin!==lastPolledCoin);
    lastPolledCoin=coin;

    kimpPolling=true;

    const isStable=STABLE_COINS.includes(coin);
    const {binance,okx,bitget}=resolveSymbols(coin);

    try{
      chrome.runtime.sendMessage(
        {type:'UB_FETCH_KIMP',coin,binanceSymbol:binance,okxInstId:okx,bitgetSymbol:bitget,coinChanged},
        (resp)=>{
          kimpPolling=false;

          if(chrome.runtime.lastError){
            return; // 확장 재로드 등으로 응답 못 받은 경우 조용히 무시
          }
          if(!resp) return;

          const el=getOrCreateKimpPanel();
          el.dataset.currentCoin=coin;

          const krName=getCoinKoreanName();
          const krEl=el.querySelector('.ub-kimp-name-kr');
          const enEl=el.querySelector('.ub-kimp-name-en');
          if(krEl) krEl.textContent=krName;
          if(enEl) enEl.textContent=coin;

          const logoEl=el.querySelector('.ub-kimp-coin-logo');
          if(logoEl){
            const logoSrc=`https://static.upbit.com/logos/${coin}.png`;
            if(logoEl.src!==logoSrc){
              logoEl.style.display='';
              logoEl.src=logoSrc;
            }
          }

          const {
            upbitPrice,binancePrice,okxPrice,bitgetPrice,
            binanceHasSpot,binanceHasFutures,
            okxHasSpot,okxHasFutures,
            bitgetHasSpot,bitgetHasFutures,
            baseRate,baseRateSource,usdtKrw,
          }=resp;

          renderKimpSide('binance',coin,binance,upbitPrice,binancePrice,baseRate,isStable,binanceHasSpot,binanceHasFutures);
          renderKimpSide('okx',coin,okx,upbitPrice,okxPrice,baseRate,isStable,okxHasSpot,okxHasFutures);
          renderKimpSide('bitget',coin,bitget,upbitPrice,bitgetPrice,baseRate,isStable,bitgetHasSpot,bitgetHasFutures);

          const usdtEl=el.querySelector('.ub-kimp-usdt');
          const baserateEl=el.querySelector('.ub-kimp-baserate');
          if(usdtEl) usdtEl.textContent = usdtKrw!=null ? `₮${formatPlain(usdtKrw)}` : 'N/A';
          if(baserateEl){
            const sourceMark=BASE_RATE_SOURCE_MARK[baseRateSource] || '';
            baserateEl.textContent = baseRate!=null ? `${sourceMark}${formatPlain(baseRate)}` : 'N/A';
          }
        }
      );
    }catch(e){
      kimpPolling=false;
    }
  }

  // ── 전체 레이아웃 계산 ──────────────────────────────────────

  function applyLayout(force){

    if(!layoutEnabled) return;
    if(isApplying) return;

    const found=getPanels();
    if(!found) return;

    const {R,chart,orderbook,orderWindow,trade,depth,coinList,lending}=found;

    const list=[chart,orderbook,orderWindow,trade,depth,coinList,lending];
    const needsReapply=list.some(e=>{
      const expected=e.dataset.ubTransform;
      if(!expected) return true;
      return e.style.transform!==expected;
    });

    // force가 true면(리사이즈 등) 다른 패널들 transform이 그대로여도
    // 무조건 재계산. 김프패널은 원본 DOM이 아니라 저희가 고정 px로
    // 박아둔 좌표라, 이 게이트에 걸려 재계산을 건너뛰면 리사이즈해도
    // 김프패널만 제자리에 남는 문제가 있었음
    if(!needsReapply && !force) return;

    isApplying=true;

    list.forEach(e=>{
      setStyleIfChanged(e,'transform','');
    });

    setStyleIfChanged(chart,'height','');
    setStyleIfChanged(chart,'minHeight','');
    setStyleIfChanged(orderbook,'height','');
    setStyleIfChanged(orderbook,'minHeight','');
    setStyleIfChanged(coinList,'width','');
    setStyleIfChanged(coinList,'minWidth','');

    neutralizeSticky(coinList,R);

    const rChart=naturalRect(chart);
    const rOrderbook=naturalRect(orderbook);
    const rOrderWindow=naturalRect(orderWindow);
    const rTrade=naturalRect(trade);
    const rDepth=naturalRect(depth);
    const rLending=naturalRect(lending);

    const col1Width=Math.max(rChart.width,rTrade.width);
    const col2Width=Math.max(rOrderbook.width,rDepth.width,rLending.width);
    const col3Width=rOrderWindow.width;

    // 1행(차트/호가창)만 높이 동기화 유지. 2행(체결/마켓뎁스/렌딩)은
    // 각자 자연 높이 사용
    const row1Height=Math.max(rChart.height,rOrderbook.height);

    setStyleIfChanged(chart,'height',`${row1Height}px`);
    setStyleIfChanged(chart,'minHeight',`${row1Height}px`);
    setStyleIfChanged(orderbook,'height',`${row1Height}px`);
    setStyleIfChanged(orderbook,'minHeight',`${row1Height}px`);

    setStyleIfChanged(coinList,'width',`${col3Width}px`);
    setStyleIfChanged(coinList,'minWidth',`${col3Width}px`);

    const kimpEl=getOrCreateKimpPanel();
    const kimpHeight=rLending.height; // 렌딩 패널과 같은 높이

    // 토글 위치는 중앙정렬 좌표(xCol1)가 아니라, 방금 위에서 측정한
    // rChart(트랜스폼 리셋 직후의 업비트 원본/미변형 위치)를 기준으로
    // 삼음. xCol1은 창 폭에 따라 음수가 될 수 있어(아래 startX 계산)
    // 그걸 그대로 쓰면 리사이즈 시 토글이 화면 밖으로 사라지는
    // 문제가 있었음
    positionToggle(rChart.left-10);

    requestAnimationFrame(()=>{

      const totalWidth=col1Width+GAP+col2Width+GAP+col3Width;
      const viewportWidth=document.documentElement.clientWidth;
      // 전체 폭(totalWidth)이 뷰포트보다 넓으면 중앙정렬 공식 결과가
      // 음수가 되는데, transform은 스크롤 가능 영역을 넓히지 않기
      // 때문에(레이아웃 박스 자체는 원래 위치에 그대로 있음) 음수만큼
      // 왼쪽으로 밀려난 부분은 브라우저가 x=0 왼쪽으로 스크롤을
      // 허용하지 않아 영영 닿을 수 없는 영역이 됨(온오프 버튼도
      // 예전엔 이 값을 그대로 써서 같이 화면 밖으로 사라졌었음).
      // 0으로 클램프해서 이런 경우엔 항상 왼쪽 원점에 붙이고, 넘치는
      // 만큼은 오른쪽으로만 스크롤하면 되도록 함(오른쪽 스크롤은
      // 항상 가능)
      const startX=Math.max(0,Math.round((viewportWidth-totalWidth)/2));

      const xCol1=startX;
      const xCol2=startX+col1Width+GAP;
      const xCol3=startX+col1Width+GAP+col2Width+GAP;

      const topY=rChart.top;

      // col1: 차트(row1Height) → 체결(자연 높이)
      const tradeY=topY+row1Height+GAP;

      // col2: 호가창(row1Height) → 마켓뎁스(자연 높이) → 렌딩(자연 높이)
      const depthY=topY+row1Height+GAP;
      const lendingY=depthY+rDepth.height+GAP;

      // col3: 주문창(자연 높이) → 김프패널(렌딩과 동일 높이) → 코인목록
      const kimpY=topY+rOrderWindow.height+GAP;
      const coinY=kimpY+kimpHeight+GAP;

      const targets=[
        [chart,       xCol1, topY],
        [orderbook,   xCol2, topY],
        [orderWindow, xCol3, topY],
        [trade,       xCol1, tradeY],
        [depth,       xCol2, depthY],
        [lending,     xCol2, lendingY],
        [coinList,    xCol3, coinY],
      ];

      targets.forEach(([el,tx,ty])=>{
        const r=naturalRect(el);
        const dx=tx-r.left;
        const dy=ty-r.top;

        setStyleIfChanged(el,'transform',`translate(${dx}px,${dy}px)`);
        setStyleIfChanged(el,'zIndex','20');

        el.dataset.ubTransform=el.style.transform;
      });

      // 김프패널은 위에서 미리 계산한 xCol3 대신, 주문창이 transform까지
      // 다 적용된 뒤의 실제 최종 렌더 위치를 다시 측정해서 그 기준으로
      // 붙임. 이러면 가로 리사이즈처럼 사전 계산값이 살짝 어긋나는
      // 상황에서도 주문창/코인목록과 항상 정확히 같은 줄에 맞음.
      // 혹시 그 사이 업비트가 주문창 DOM 자체를 새로 그렸을 경우를
      // 대비해 살아있는지만 가볍게 확인(죽었을 때만 findPanels() 재스캔 -
      // 매번 무거운 재스캔을 도는 대신 평소엔 contains() 체크 한 줄로 끝남)
      let orderWindowFresh=orderWindow;
      if(!document.body.contains(orderWindowFresh)){
        cachedPanels=null;
        const refreshed=getPanels();
        orderWindowFresh=(refreshed && refreshed.orderWindow) ? refreshed.orderWindow : orderWindow;
      }
      const rOrderWindowFinal=orderWindowFresh.getBoundingClientRect();
      const kimpXFinal=Math.round(rOrderWindowFinal.left);
      const kimpYFinal=Math.round(rOrderWindowFinal.bottom)+GAP;
      positionKimpPanel(kimpEl,kimpXFinal,kimpYFinal,col3Width,kimpHeight);

      // 리사이즈 드래그 중 실시간 추적용으로 최신 주문창 참조를 저장
      lastKnownOrderWindow=orderWindowFresh;

      setTimeout(()=>{ isApplying=false; },50);
    });
  }

  let pendingForce=false;

  function scheduleApply(force){
    if(!layoutEnabled) return;
    if(force) pendingForce=true;
    if(isApplying) return;
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(()=>{
      const f=pendingForce;
      pendingForce=false;
      applyLayout(f);
    },DEBOUNCE_MS);
  }

  // ── 부트스트랩 ──────────────────────────────────────────────
  // 업비트는 메뉴 이동 시 새로고침 없이 화면만 바뀌는 SPA라서, "지금
  // 거래소 페이지에 있는지"를 주기적으로 가볍게 확인해서 그때그때
  // 레이아웃 적용 여부를 맞춤. isExchangePage()는 URL 경로만 보는
  // 가벼운 체크라 부하는 거의 없음. 토글 스위치 자체는 모든 페이지에서
  // 항상 떠 있음(거래소 페이지 한정 아님) - 김프패널/6패널 재배치만
  // 거래소 페이지로 제한됨
  function pageContextTick(){
    getOrCreateToggle(); // 항상 존재/표시

    const onExchange=isExchangePage();

    if(onExchange){
      if(layoutEnabled){
        activateLayout();
        if(kimpPanelEl) kimpPanelEl.style.display='flex';
      }
    }else{
      if(isActive) deactivateLayout();
      if(kimpPanelEl) kimpPanelEl.style.display='none';
    }
  }

  window.addEventListener('resize',()=>{
    if(!layoutEnabled || !isActive) return;
    liveTrackKimpPosition();
    scheduleApply(true);
  });

  loadEnabledState(()=>{
    pageContextTick();
    setInterval(pageContextTick,1000);
  });

})();
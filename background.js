/* Upbit Layout Fixer - background.js
 * v1.0.0_b001 — 신규 파일. 김프 정보패널용 시세 데이터를 여기서 fetch함.
 * v1.0.0_b002 — 심볼 override(수동 매핑) 지원.
 * v1.0.0_b003 — (폐기) Frankfurter 실물환율 추가했으나 하루 1회 갱신이라
 *          문제.
 * v1.0.0_b004 — (폐기) 스테이블코인 전용으로 BTC 크로스레이트 방식 도입.
 * v1.0.0_b005 — 기준환율 소스를 야후 파이낸스(1순위) + 두나무(백업)로 교체.
 *          야후 파이낸스 차트 API(KRW=X)는 장이 닫혀 있어도 마지막
 *          시세를 그대로 반환해줘서, 주말/장마감 처리를 별도로 안 짜도
 *          자동으로 해결됨. 5초 캐싱(코인 시세는 여전히 1초 그대로).
 *          모든 코인(테더 포함) 계산을 하나의 파이프라인으로 통일:
 *          김프% = (업비트가 / (해외거래소 코인가 × 기준환율) - 1) × 100
 *          테더 등 스테이블코인은 "해외거래소 코인가"가 그냥 1로 고정된
 *          특수 케이스로 취급 - 별도 BTC 브릿지 로직 전부 제거
 * v1.0.0_b006 — 기준환율 소스에 네이버 금융 실시간 폴링 엔드포인트를 1순위로
 *          추가(polling.finance.naver.com). 네이버 자체 페이지가 몇 초
 *          간격으로 이 주소를 폴링해서 위젯을 갱신하는 구조라 야후보다
 *          더 촘촘한 간격으로 값이 바뀜. 다만 비공식/미문서화 API라
 *          예고 없이 막히거나 응답 형식이 바뀔 수 있음 - 실패하면
 *          야후로, 그것도 실패하면 두나무로 순차 폴백
 * v1.0.0_b007 — 우선순위 배열(BASE_RATE_SOURCE_ORDER)을 상단으로 빼서 순서
 *          바꾸기 쉽게 만듦. 순서를 두나무 → 네이버 → 야후로 변경
 * v1.0.0_b008 — 기준 버전 재지정. 김프패널 기능이 완성된 현재 상태를
 *          새 기준으로 재지정. 이전 이력은 구버전 번호(구v1.x.x)로
 *          아래에 남김
 * v1.0.0_b008 — 성능 개선: 화면 표시용 업비트 테더가 조회에 5초 캐싱
 *          적용(기존엔 계산에 안 쓰는데도 매초 API 호출하고 있었음)
 * v1.0.0_b010 — 업비트 테더가 캐싱을 5초→1초로 복원(사용자 요청)
 * v1.0.0_b011 — 현물 마켓 자체가 없는 코인(ZKP, DOS 등) 대응: 현물을
 *          먼저 시도하고 실패하면 바이낸스 선물(fapi.binance.com)/OKX
 *          무기한스왑({코인}-USDT-SWAP)으로 자동 폴백. manifest.json에
 *          fapi.binance.com 권한 추가
 * v1.0.0_b012 — 김프% 클릭→현물, 가격차 클릭→선물로 각각 다른 링크를
 *          걸기 위해 현물/선물 존재 여부를 각각 따로 추적하도록 변경.
 *          매초 둘 다 조회하면 부하가 2배가 되는 문제가 있어서, "코인이
 *          바뀐 시점"에만 현물/선물을 동시에 확인해 어느 쪽을 쓸지
 *          결정(binanceMode/okxMode)해두고, 이후 같은 코인 폴링에서는
 *          결정된 한쪽만 조회하도록 최적화
 * v1.0.0_b013 — 종합 수정
 *          1) 비트겟 필드명 오타 수정: lastPrice → lastPr
 *          2) 바이낸스/OKX 존재 확인 방식을 "가격이 오나"에서 "실제로
 *             거래 가능한 상태인가"로 교체(상장폐지 심볼이 마지막
 *             거래가를 계속 반환하는 문제 대응). 바이낸스는 exchangeInfo
 *             의 status==='TRADING', OKX는 public/instruments의
 *             state==='live'로 확인
 *          3) 코인 바뀔 때 하는 전수조사가 일시적 네트워크 오류로 전부
 *             null이 나온 경우 영구 캐싱해버리던 버그 수정 - 업비트
 *             가격도 같이 실패한 경우엔 캐싱하지 않고 재시도하도록 변경
 * v1.0.0_b014 — 기준환율 캐싱 TTL 5초→1초로 변경(사용자 요청)
 * v1.0.0_b015 — 비트겟도 바이낸스/OKX와 동일하게 실제 거래 가능 상태
 *          확인 추가. 현물: spot/public/symbols의 status==='online',
 *          선물: mix/market/contracts의 symbolStatus==='normal'
 *          (둘 다 실제 응답 확인 후 필드명 확정)
 * v1.0.0_b016 — 기준환율 소스 교체(네이버/두나무가 더 이상 응답하지
 *          않음 확인). 네이버는 polling.finance.naver.com →
 *          api.stock.naver.com/marketindex/exchange/FX_USDKRW로 교체.
 *          두나무(quotation-api-cdn.dunamu.com)는 다음(finance.daum.net/
 *          api/exchanges/summaries)으로 대체. biquote.io/api/USDKRW
 *          신규 추가. 시도 순서를 다음→네이버→야후→biquote로 변경
 * v1.0.0_b017 — (버그 수정) 네이버/biquote가 계속 실패하던 원인 확인.
 *          네이버는 URL이 틀렸음 - api.stock.naver.com/marketindex/
 *          exchange/FX_USDKRW는 그 자체로는 유효한 엔드포인트가 아니고
 *          .../FX_USDKRW/prices?page=1&pageSize=1 형태로 호출해야 함.
 *          응답도 객체가 아니라 배열을 그대로 반환(래핑 없음). biquote는
 *          URL은 맞았지만 필드명이 틀렸음 - 공식 문서 기준 가격 필드는
 *          mid(last/volume은 FX/CFD 피드에서 항상 0으로 내려오는 필드라
 *          쓰면 안 됨)
 */

// 기준환율 시도 순서. 앞에서부터 순서대로 시도하다가 처음 성공하는 걸
// 씀. 순서 바꾸고 싶으면 이 배열만 재배열하면 됨
const BASE_RATE_SOURCE_ORDER=['daum','naver','yahoo','biquote'];

const BASE_RATE_TTL_MS=1000;
let cachedBaseRate=null;   // { rate, source, ts }

async function fetchNaverRate(){
  const r=await fetch('https://api.stock.naver.com/marketindex/exchange/FX_USDKRW/prices?page=1&pageSize=1');
  if(!r.ok) throw new Error('naver http error');
  const d=await r.json();
  // 이 엔드포인트는 객체가 아니라 배열을 그대로 반환함(래핑 없음)
  const item=Array.isArray(d) ? d[0] : (d && d.result && d.result[0]);
  const rate=item ? (item.closePrice ?? item.closePriceFormatted) : null;
  const parsed=rate!=null ? parseFloat(String(rate).replace(/,/g,'')) : null;
  if(!parsed) throw new Error('naver no rate');
  return parsed;
}

async function fetchYahooRate(){
  const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/KRW=X');
  if(!r.ok) throw new Error('yahoo http error');
  const d=await r.json();
  const rate=d && d.chart && d.chart.result && d.chart.result[0] && d.chart.result[0].meta
    ? d.chart.result[0].meta.regularMarketPrice : null;
  if(!rate) throw new Error('yahoo no rate');
  return parseFloat(rate);
}

async function fetchDaumRate(){
  const r=await fetch('https://finance.daum.net/api/exchanges/summaries');
  if(!r.ok) throw new Error('daum http error');
  const d=await r.json();
  // 실제 응답 구조가 문서화돼 있지 않아 몇 가지 있을 법한 경로를 순서대로 시도
  const list=d && (d.data ?? d);
  const item=Array.isArray(list) ? list.find(x=>x && (x.symbolCode==='FRX.KRWUSD' || x.currencyCode==='USD' || x.name==='미국 USD')) : null;
  const rate=item ? (item.basePrice ?? item.closePrice ?? item.currentPrice) : null;
  const parsed=rate!=null ? parseFloat(String(rate).replace(/,/g,'')) : null;
  if(!parsed) throw new Error('daum no rate');
  return parsed;
}

async function fetchBiquoteRate(){
  const r=await fetch('https://biquote.io/api/USDKRW');
  if(!r.ok) throw new Error('biquote http error');
  const d=await r.json();
  // biquote 공식 응답 스펙: 가격 필드는 mid(last/volume은 FX/CFD에서
  // 항상 0으로 내려오므로 쓰면 안 됨)
  const rate=d ? (d.mid ?? d.bid ?? d.ask) : null;
  const parsed=rate!=null ? parseFloat(String(rate).replace(/,/g,'')) : null;
  if(!parsed) throw new Error('biquote no rate');
  return parsed;
}

const BASE_RATE_FETCHERS={
  naver: fetchNaverRate,
  yahoo: fetchYahooRate,
  daum: fetchDaumRate,
  biquote: fetchBiquoteRate,
};

async function getBaseRate(){
  const now=Date.now();
  if(cachedBaseRate && (now-cachedBaseRate.ts)<BASE_RATE_TTL_MS){
    return cachedBaseRate;
  }

  for(const source of BASE_RATE_SOURCE_ORDER){
    const fetcher=BASE_RATE_FETCHERS[source];
    if(!fetcher) continue;
    try{
      const rate=await fetcher();
      cachedBaseRate={ rate, source, ts:now };
      return cachedBaseRate;
    }catch(e){
      // 실패하면 다음 순위로 넘어감
    }
  }

  // 전부 실패하면 직전 캐시(있다면)를 그대로 유지해서 반환. 이러면
  // 일시적 네트워크 오류나 장 마감 상황에서도 값이 뚝 끊기지 않고
  // 마지막 값이 계속 쓰임
  return cachedBaseRate;
}

// 패널 우측 표시용 업비트 테더가. 계산엔 안 쓰고 화면 표시용이라
// 기준환율처럼 5초 캐싱 - 매초 호출할 필요가 없어 API 호출량을 줄임
const USDT_KRW_TTL_MS=1000;
let cachedUsdtKrw=null; // { price, ts }

async function getUsdtKrw(){
  const now=Date.now();
  if(cachedUsdtKrw && (now-cachedUsdtKrw.ts)<USDT_KRW_TTL_MS){
    return cachedUsdtKrw.price;
  }
  try{
    const r=await fetch('https://api.upbit.com/v1/ticker?markets=KRW-USDT');
    if(!r.ok) throw new Error('upbit usdt http error');
    const d=await r.json();
    const price=d && d[0] ? d[0].trade_price : null;
    if(price==null) throw new Error('upbit usdt no price');
    cachedUsdtKrw={ price, ts:now };
    return price;
  }catch(e){
    // 실패하면 직전 캐시(있다면) 유지
    return cachedUsdtKrw ? cachedUsdtKrw.price : null;
  }
}

// 현물 마켓이 아예 없는 코인(예: ZKP, DOS)이 있어서 현물/선물 존재
// 여부를 확인해야 하는데, 매초 둘 다 조회하면 부하가 2배가 됨. 그래서
// "코인이 바뀐 시점"에만 현물/선물을 동시에 확인해서 어느 쪽을 쓸지
// 결정(spotMode)해두고, 그 이후 같은 코인 폴링에서는 결정된 한쪽만
// 조회함. 나중에 실제로 현물이 상장돼도, 코인을 다시 선택하기 전까진
// 그 사실을 모름(코인 재선택 시 다시 판단됨)
let lastMarketCoin=null;
let lastMarketInfo=null; // { binanceMode, binanceHasSpot, binanceHasFutures, okxMode, okxHasSpot, okxHasFutures, bitgetMode, bitgetHasSpot, bitgetHasFutures }

async function fetchBinanceSpotPrice(symbol){
  if(!symbol) return null;
  try{
    const r=await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    if(r.ok){
      const d=await r.json();
      if(d && d.price) return parseFloat(d.price);
    }
  }catch(e){}
  return null;
}

async function fetchBinanceFuturesPrice(symbol){
  if(!symbol) return null;
  try{
    const r=await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
    if(r.ok){
      const d=await r.json();
      if(d && d.price) return parseFloat(d.price);
    }
  }catch(e){}
  return null;
}

async function fetchOkxSpotPrice(instId){
  if(!instId) return null;
  try{
    const r=await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${instId}`);
    if(r.ok){
      const d=await r.json();
      const last=d && d.data && d.data[0] && d.data[0].last;
      if(last) return parseFloat(last);
    }
  }catch(e){}
  return null;
}

async function fetchOkxFuturesPrice(instId){
  if(!instId) return null;
  const coinPart=instId.split('-')[0];
  const swapInstId=`${coinPart}-USDT-SWAP`;
  try{
    const r=await fetch(`https://www.okx.com/api/v5/market/ticker?instId=${swapInstId}`);
    if(r.ok){
      const d=await r.json();
      const last=d && d.data && d.data[0] && d.data[0].last;
      if(last) return parseFloat(last);
    }
  }catch(e){}
  return null;
}

async function fetchBitgetSpotPrice(symbol){
  if(!symbol) return null;
  try{
    const r=await fetch(`https://api.bitget.com/api/v2/spot/market/tickers?symbol=${symbol}`);
    if(r.ok){
      const d=await r.json();
      const price=d && d.data && d.data[0] && d.data[0].lastPr;
      if(price) return parseFloat(price);
    }
  }catch(e){}
  return null;
}

async function fetchBitgetFuturesPrice(symbol){
  if(!symbol) return null;
  try{
    const r=await fetch(`https://api.bitget.com/api/v2/mix/market/tickers?symbol=${symbol}&productType=USDT-FUTURES`);
    if(r.ok){
      const d=await r.json();
      const price=d && d.data && d.data[0] && d.data[0].lastPr;
      if(price) return parseFloat(price);
    }
  }catch(e){}
  return null;
}

// 상장폐지된 심볼도 ticker/price가 마지막 거래가를 계속 돌려주는
// 경우가 있어서, 가격 유무만으로 존재를 판단하면 오판함. 실제로
// 지금 거래 가능한 상태인지 별도로 확인
async function isBinanceSpotTrading(symbol){
  if(!symbol) return false;
  try{
    const r=await fetch(`https://api.binance.com/api/v3/exchangeInfo?symbol=${symbol}`);
    if(r.ok){
      const d=await r.json();
      const s=d && d.symbols && d.symbols[0];
      return !!(s && s.status==='TRADING');
    }
  }catch(e){}
  return false;
}

async function isBinanceFuturesTrading(symbol){
  if(!symbol) return false;
  try{
    const r=await fetch(`https://fapi.binance.com/fapi/v1/exchangeInfo`);
    if(r.ok){
      const d=await r.json();
      const list=d && d.symbols;
      const s=list && list.find(x=>x.symbol===symbol);
      return !!(s && s.status==='TRADING');
    }
  }catch(e){}
  return false;
}

async function isOkxSpotLive(instId){
  if(!instId) return false;
  try{
    const r=await fetch(`https://www.okx.com/api/v5/public/instruments?instType=SPOT&instId=${instId}`);
    if(r.ok){
      const d=await r.json();
      const s=d && d.data && d.data[0];
      return !!(s && s.state==='live');
    }
  }catch(e){}
  return false;
}

async function isOkxSwapLive(swapInstId){
  if(!swapInstId) return false;
  try{
    const r=await fetch(`https://www.okx.com/api/v5/public/instruments?instType=SWAP&instId=${swapInstId}`);
    if(r.ok){
      const d=await r.json();
      const s=d && d.data && d.data[0];
      return !!(s && s.state==='live');
    }
  }catch(e){}
  return false;
}

async function fetchBinanceBoth(symbol){
  if(!symbol) return { spotPrice:null, futuresPrice:null };
  const [priceRes,tradingRes]=await Promise.allSettled([
    Promise.allSettled([fetchBinanceSpotPrice(symbol),fetchBinanceFuturesPrice(symbol)]),
    Promise.allSettled([isBinanceSpotTrading(symbol),isBinanceFuturesTrading(symbol)]),
  ]);
  const prices=priceRes.status==='fulfilled' ? priceRes.value : [null,null];
  const trading=tradingRes.status==='fulfilled' ? tradingRes.value : [null,null];
  const spotPrice=(prices[0] && prices[0].status==='fulfilled') ? prices[0].value : null;
  const futuresPrice=(prices[1] && prices[1].status==='fulfilled') ? prices[1].value : null;
  const spotTrading=(trading[0] && trading[0].status==='fulfilled') ? trading[0].value : false;
  const futuresTrading=(trading[1] && trading[1].status==='fulfilled') ? trading[1].value : false;
  return {
    spotPrice: (spotTrading && spotPrice!=null) ? spotPrice : null,
    futuresPrice: (futuresTrading && futuresPrice!=null) ? futuresPrice : null,
  };
}

async function fetchOkxBoth(instId){
  if(!instId) return { spotPrice:null, futuresPrice:null };
  const coinPart=instId.split('-')[0];
  const swapInstId=`${coinPart}-USDT-SWAP`;
  const [priceRes,tradingRes]=await Promise.allSettled([
    Promise.allSettled([fetchOkxSpotPrice(instId),fetchOkxFuturesPrice(instId)]),
    Promise.allSettled([isOkxSpotLive(instId),isOkxSwapLive(swapInstId)]),
  ]);
  const prices=priceRes.status==='fulfilled' ? priceRes.value : [null,null];
  const trading=tradingRes.status==='fulfilled' ? tradingRes.value : [null,null];
  const spotPrice=(prices[0] && prices[0].status==='fulfilled') ? prices[0].value : null;
  const futuresPrice=(prices[1] && prices[1].status==='fulfilled') ? prices[1].value : null;
  const spotLive=(trading[0] && trading[0].status==='fulfilled') ? trading[0].value : false;
  const futuresLive=(trading[1] && trading[1].status==='fulfilled') ? trading[1].value : false;
  return {
    spotPrice: (spotLive && spotPrice!=null) ? spotPrice : null,
    futuresPrice: (futuresLive && futuresPrice!=null) ? futuresPrice : null,
  };
}

async function isBitgetSpotOnline(symbol){
  if(!symbol) return false;
  try{
    const r=await fetch(`https://api.bitget.com/api/v2/spot/public/symbols`);
    if(r.ok){
      const d=await r.json();
      const list=d && d.data;
      const s=list && list.find(x=>x.symbol===symbol);
      return !!(s && s.status==='online');
    }
  }catch(e){}
  return false;
}

async function isBitgetFuturesNormal(symbol){
  if(!symbol) return false;
  try{
    const r=await fetch(`https://api.bitget.com/api/v2/mix/market/contracts?productType=USDT-FUTURES`);
    if(r.ok){
      const d=await r.json();
      const list=d && d.data;
      const s=list && list.find(x=>x.symbol===symbol);
      return !!(s && s.symbolStatus==='normal');
    }
  }catch(e){}
  return false;
}

async function fetchBitgetBoth(symbol){
  if(!symbol) return { spotPrice:null, futuresPrice:null };
  const [priceRes,statusRes]=await Promise.allSettled([
    Promise.allSettled([fetchBitgetSpotPrice(symbol),fetchBitgetFuturesPrice(symbol)]),
    Promise.allSettled([isBitgetSpotOnline(symbol),isBitgetFuturesNormal(symbol)]),
  ]);
  const prices=priceRes.status==='fulfilled' ? priceRes.value : [null,null];
  const statuses=statusRes.status==='fulfilled' ? statusRes.value : [null,null];
  const spotPrice=(prices[0] && prices[0].status==='fulfilled') ? prices[0].value : null;
  const futuresPrice=(prices[1] && prices[1].status==='fulfilled') ? prices[1].value : null;
  const spotOnline=(statuses[0] && statuses[0].status==='fulfilled') ? statuses[0].value : false;
  const futuresNormal=(statuses[1] && statuses[1].status==='fulfilled') ? statuses[1].value : false;
  return {
    spotPrice: (spotOnline && spotPrice!=null) ? spotPrice : null,
    futuresPrice: (futuresNormal && futuresPrice!=null) ? futuresPrice : null,
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'UB_FETCH_KIMP') return false;

  (async () => {
    const { coin, binanceSymbol, okxInstId, bitgetSymbol, coinChanged } = msg;

    const upbitMarket = `KRW-${coin}`;

    const needFullCheck = coinChanged || lastMarketCoin!==coin || !lastMarketInfo;

    let binancePriceJob, okxPriceJob, bitgetPriceJob;

    if(needFullCheck){
      binancePriceJob=fetchBinanceBoth(binanceSymbol);
      okxPriceJob=fetchOkxBoth(okxInstId);
      bitgetPriceJob=fetchBitgetBoth(bitgetSymbol);
    }else{
      const mi=lastMarketInfo;
      binancePriceJob=(mi.binanceMode==='spot') ? fetchBinanceSpotPrice(binanceSymbol)
        : (mi.binanceMode==='futures') ? fetchBinanceFuturesPrice(binanceSymbol)
        : Promise.resolve(null);
      okxPriceJob=(mi.okxMode==='spot') ? fetchOkxSpotPrice(okxInstId)
        : (mi.okxMode==='futures') ? fetchOkxFuturesPrice(okxInstId)
        : Promise.resolve(null);
      bitgetPriceJob=(mi.bitgetMode==='spot') ? fetchBitgetSpotPrice(bitgetSymbol)
        : (mi.bitgetMode==='futures') ? fetchBitgetFuturesPrice(bitgetSymbol)
        : Promise.resolve(null);
    }

    const jobs = [
      fetch(`https://api.upbit.com/v1/ticker?markets=${upbitMarket}`)
        .then(r => r.ok ? r.json() : null),
      binancePriceJob,
      okxPriceJob,
      bitgetPriceJob,
      getBaseRate(),
      // coin 자체가 USDT면 위에서 이미 받은 값과 같으니 중복 호출 생략
      coin === 'USDT' ? Promise.resolve(null) : getUsdtKrw(),
    ];

    const [upbitRes, binanceRes, okxRes, bitgetRes, baseRateRes, usdtRes] = await Promise.allSettled(jobs);

    const upbitPrice = (upbitRes.status === 'fulfilled' && upbitRes.value && upbitRes.value[0])
      ? upbitRes.value[0].trade_price : null;

    let binancePrice, okxPrice, bitgetPrice;

    if(needFullCheck){
      const binanceBoth = (binanceRes.status === 'fulfilled') ? binanceRes.value : { spotPrice:null, futuresPrice:null };
      const okxBoth = (okxRes.status === 'fulfilled') ? okxRes.value : { spotPrice:null, futuresPrice:null };
      const bitgetBoth = (bitgetRes.status === 'fulfilled') ? bitgetRes.value : { spotPrice:null, futuresPrice:null };

      binancePrice = binanceBoth.spotPrice ?? binanceBoth.futuresPrice;
      okxPrice = okxBoth.spotPrice ?? okxBoth.futuresPrice;
      bitgetPrice = bitgetBoth.spotPrice ?? bitgetBoth.futuresPrice;

      // 업비트 가격까지 같이 실패했다면 "이 코인은 마켓이 없다"가
      // 아니라 그 순간 네트워크 문제였을 가능성이 높음 - 이 경우
      // 결과를 캐싱하지 않아서 다음 폴링에 다시 전수조사를 시도하게 함
      // (캐싱해버리면 코인 바꾸기 전까진 영영 N/A로 얼어붙는 버그였음)
      if(upbitPrice!=null){
        lastMarketInfo = {
          binanceMode: binanceBoth.spotPrice!=null ? 'spot' : (binanceBoth.futuresPrice!=null ? 'futures' : null),
          binanceHasSpot: binanceBoth.spotPrice!=null,
          binanceHasFutures: binanceBoth.futuresPrice!=null,
          okxMode: okxBoth.spotPrice!=null ? 'spot' : (okxBoth.futuresPrice!=null ? 'futures' : null),
          okxHasSpot: okxBoth.spotPrice!=null,
          okxHasFutures: okxBoth.futuresPrice!=null,
          bitgetMode: bitgetBoth.spotPrice!=null ? 'spot' : (bitgetBoth.futuresPrice!=null ? 'futures' : null),
          bitgetHasSpot: bitgetBoth.spotPrice!=null,
          bitgetHasFutures: bitgetBoth.futuresPrice!=null,
        };
        lastMarketCoin=coin;
      }
    }else{
      binancePrice = (binanceRes.status === 'fulfilled') ? binanceRes.value : null;
      okxPrice = (okxRes.status === 'fulfilled') ? okxRes.value : null;
      bitgetPrice = (bitgetRes.status === 'fulfilled') ? bitgetRes.value : null;
    }

    const baseRateInfo = (baseRateRes.status === 'fulfilled' && baseRateRes.value) ? baseRateRes.value : null;

    const usdtKrw = coin === 'USDT'
      ? upbitPrice
      : ((usdtRes.status === 'fulfilled') ? usdtRes.value : null);

    sendResponse({
      upbitPrice,
      binancePrice,
      okxPrice,
      bitgetPrice,
      binanceMode: lastMarketInfo ? lastMarketInfo.binanceMode : null,
      binanceHasSpot: lastMarketInfo ? lastMarketInfo.binanceHasSpot : false,
      binanceHasFutures: lastMarketInfo ? lastMarketInfo.binanceHasFutures : false,
      okxMode: lastMarketInfo ? lastMarketInfo.okxMode : null,
      okxHasSpot: lastMarketInfo ? lastMarketInfo.okxHasSpot : false,
      okxHasFutures: lastMarketInfo ? lastMarketInfo.okxHasFutures : false,
      bitgetMode: lastMarketInfo ? lastMarketInfo.bitgetMode : null,
      bitgetHasSpot: lastMarketInfo ? lastMarketInfo.bitgetHasSpot : false,
      bitgetHasFutures: lastMarketInfo ? lastMarketInfo.bitgetHasFutures : false,
      usdtKrw,
      baseRate: baseRateInfo ? baseRateInfo.rate : null,
      baseRateSource: baseRateInfo ? baseRateInfo.source : null,
    });
  })();

  return true; // 비동기 sendResponse 사용을 위해 true 반환 필수
});
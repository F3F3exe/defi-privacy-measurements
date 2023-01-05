const braveLoggerLib = require('./logging.js')
const bravePuppeteerLib = require('./puppeteer.js')
const { createTimer } = require('./timer');
const {importWallet, connectWallet, launchApp} = require('./helper');
const NATIVE_CLICK = 'native';
const fs = require('fs');

let wallet = "";
let mm = "";

const DEFAULT_VIEWPORT = {
  width: 1280,
  height: 780
}

const waitForNavigation = async (page) => {
  const POST_CLICK_LOAD_TIMEOUT = 2000;
  let maxWaitTimeInMillisecs =  2000;

  if (maxWaitTimeInMillisecs <= POST_CLICK_LOAD_TIMEOUT) {
      maxWaitTimeInMillisecs = POST_CLICK_LOAD_TIMEOUT;
  }

  try {
      console.log(`Will wait for navigation ${await page.url()}`);
      const clickLoadTimer = createTimer();
      await page.waitForNavigation({ 'timeout': maxWaitTimeInMillisecs, 'waitUntil': 'load' });
      console.log(`Page load after click took ${clickLoadTimer.getElapsedTime()}s`);
      await page.waitForTimeout(maxWaitTimeInMillisecs);
  } catch (error) {
      console.log(`Error while waiting navigation ${await page.url()}`);
  }
}



const onRequest = async (options, requestLog, request) => {
  let requestContext = []

  const frame = request.frame()
  if (frame) {
    if (options.printFrameHierarchy) {
      requestContext = []
      let parentFrame = frame
      while (parentFrame) {
        requestContext.push(parentFrame.url())
        parentFrame = await parentFrame.parentFrame()
      }
    } else {
      requestContext.push(frame.url())
    }
  }

  const requestUrl = request.url()
  const requestType = request.resourceType()
  const requestMethod = request.method()
  const requestHeaders = request.headers()
  const requestPostData = request.postData()

  requestLog.requests.push({
    requestContext,
    url: requestUrl,
    type: requestType,
    method: requestMethod,
    headers: requestHeaders,
    postData: requestPostData
  })

  const numRequests = requestLog.requests.length
  const logger = braveLoggerLib.getLoggerForLevel(options.debugLevel)
  logger.debug(`Request ${numRequests}: ${requestUrl}`)
}

const onTargetCreated = async (options, requestLog, target) => {
  if (target.type() !== 'page') {
    return
  }
  const page = await target.page()
  page.on('request', onRequest.bind(undefined, options, requestLog))

  const logger = braveLoggerLib.getLoggerForLevel(options.debugLevel)
  logger.debug('Completed configuring new page.')
}

const crawl = async args => {
  const logger = braveLoggerLib.getLoggerForLevel(args.debugLevel)

  const url = args.url

  const log = Object.create(null)
  log.url = url
  log.arguments = args
  log.timestamps = {
    start: Date.now(),
    end: undefined
  }
  log.requests = []
  log.success = true

  let browser
  try {
    browser = await bravePuppeteerLib.launch(args)

    browser.on('targetcreated', onTargetCreated.bind(undefined, args, log))

    //await mm_page.bringToFront()


    const page = await browser.newPage()
    await waitForNavigation(page)
    logger.debug(`Visiting ${url}`)

    const pages = await browser.pages()

    await page.goto(url, {waitUntil: "domcontentloaded"});
    await (pages[pages.length - 1]).bringToFront();

    
    

    
    /*

    //logger.debug(`nr of pages:: ${pages.length}`)
    const mm_login = await pages[pages.length - 1]
    await mm_login.bringToFront();
   
    try {
      mm_login.setDefaultNavigationTimeout(0);
      await importWallet(mm_login);
    } catch {
      logger.debug('failed to import wallet');
    }

    await page.goto(url, {waitUntil: "domcontentloaded"});
    await (pages[pages.length - 2]).bringToFront();

    try {
      let new_url = await launchApp(page, logger, browser);
      console.log('app found:');
      console.log(new_url);
    } catch (error) {
      console.log(`already on app or not found: ${error}`);
      console.log(url);
    }
   
    try {
      page.setDefaultNavigationTimeout(0);
      page.setDefaultTimeout(0);
      await connectWallet(page, logger, browser);
    } catch {
      logger.debug('connecting to metamask failed');
    }

*/

    const waitTimeMs = 20000;
    logger.debug(`Waiting for ${waitTimeMs}ms`)

    await page.waitForTimeout(waitTimeMs)
    
  } catch (error) {
    log.success = false
    log.msg = error.toString()
    logger.debug(`Caught error when crawling: for ${log.msg}`)
  }


  try {
    let pages = await browser.pages();
    let page1 = await (pages[pages.length - 1]);
    let content = await page1.url() + '\n'
    fs.appendFile('/home/fefe/new/defi-privacy-measurements/new_urls_dapps_exchanges.txt', content, err => {
      if (err) {
        console.log('no login found');
      }
    });
    //await page.close()
  } catch (error) {
    
  }

  try {
    logger.debug('Trying to shutdown')
    await browser.close()
  } catch (e) {
    logger.debug(`Error when shutting down: ${e.toString()}`)
  }

  log.timestamps.end = Date.now()
  return log
}

const timeoutPromise = async (promise, ms) => {
  let timeout = new Promise(function(resolve, reject) {
      setTimeout(resolve, ms, 1);
  });
  let result = Promise.race([promise, timeout]).then(function(value) {
      return value;
  });
  return result;
}


const click = async (elHandle, loginRegisterLinkAttrs, method = "method1", page) => {
  try {
      if (method === NATIVE_CLICK) {
          await elHandle.click();
      } else {
          await page.evaluate(el => el.click(), elHandle);
      }
  } catch (error) {
      console.log(`Error while ${method} clicking on ${await page.url()} ` +
          `${JSON.stringify(loginRegisterLinkAttrs)} ErrorMsg: `);
      return false;
  }
  return true;
}

module.exports = {
  crawl
}

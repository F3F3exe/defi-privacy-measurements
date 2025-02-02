const braveLoggerLib = require('./logging.js')
const bravePuppeteerLib = require('./puppeteer.js')
const { createTimer } = require('./timer');
const {importWallet, connectWallet, connectMetamask} = require('./helper');
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


    const page = await browser.newPage()
    await waitForNavigation(page)
    logger.debug(`Visiting ${url}`)

    const pages = await browser.pages()
    const mm_login = await pages[pages.length - 1]

    await mm_login.bringToFront();
   
    try {
      //read in the passphrase and password from a given file
      var data = fs.readFileSync('./../request-logger/wallet_info.txt','utf8');
      var wallet_info = data.split('\n');

      let wallet_passphrase = wallet_info[0];
      let wallet_password = wallet_info[1];

      await importWallet(mm_login, wallet_passphrase, wallet_password);

    } catch {
      logger.debug('failed to import wallet');
    }

    await page.goto(url, {waitUntil: "domcontentloaded"});
    await (pages[pages.length - 2]).bringToFront();
   
    try {
      page.setDefaultNavigationTimeout(0);
      page.setDefaultTimeout(0);
      await connectWallet(page, logger, browser);
    } catch {
      logger.debug('connecting to metamask failed');
    }



    const waitTimeMs = args.secs * 500;
    logger.debug(`Waiting for ${waitTimeMs}ms`)
    await page.waitForTimeout(waitTimeMs)
    await page.close()
  } catch (error) {
    log.success = false
    log.msg = error.toString()
    logger.debug(`Caught error when crawling: for ${log.msg}`)
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





module.exports = {
  crawl
}

const braveLoggerLib = require('./logging.js')
const bravePuppeteerLib = require('./puppeteer.js')
const { createTimer } = require('./timer');
const NATIVE_CLICK = 'native';

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
      console.log(`Error while waiting navigation ${await page.url()} ${pageUtils.removeNewLineChar(error.message)}`);
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

  requestLog.requests.push({
    requestContext,
    url: requestUrl,
    type: requestType
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

    logger.debug(`nr of pages: ${pages.length}`)
    const mm_login = await pages[pages.length - 1]
    await mm_login.bringToFront();
    const get_started_button = await mm_login
        .waitForXPath('//*[@id="app-content"]/div/div[2]/div/div/div/button');
    await mm_login.evaluate($submit => $submit.click(), get_started_button);
    const no_thanks_button = await mm_login.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div/div/div[5]/div[1]/footer/button[1]');
    await mm_login.evaluate($submit => $submit.click(), no_thanks_button);
    const import_wallet_button = await mm_login.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div/div[2]/div/div[2]/div[1]/button');
    await mm_login.evaluate($submit => $submit.click(), import_wallet_button);
    const passphrase = ["already", "turtle", "birth", "enroll", "since", "owner", "keep", "patch", "skirt", "drift", "any", "dinner"];

    for (let i = 0; i < 12; i++) {
        //let xpath = '//*[@id="import-srp__srp-word-' + i + '"]';
        //log(xpath);
        const fill_phrase = await mm_login.waitForXPath('//*[@id="import-srp__srp-word-' + i + '"]');
        await fill_phrase.type(passphrase[i]);
    }

    const fill_password = await mm_login.waitForXPath(' //*[@id="password"]');
    await fill_password.type('password1234');
    const fill_password2 = await mm_login.waitForXPath(' //*[@id="confirm-password"]');
    await fill_password2.type('password1234');
    const click_agree_button = await mm_login.waitForXPath('//*[@id="create-new-vault__terms-checkbox"]');
    await mm_login.evaluate($submit => $submit.click(), click_agree_button);
    //*[@id="confirm-password"]
    const submit_button = await mm_login.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div/div[2]/form/button');
    await mm_login.evaluate($submit => $submit.click(), submit_button);

    const all_done_button = await mm_login.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div/button');
    await mm_login.evaluate($submit => $submit.click(), all_done_button);
    

    await page.goto(url, {})
    await (pages[pages.length - 2]).bringToFront()

    let wallet_buttons = ["Connect Wallet", "Connect wallet", "Connect to a wallet",  "Connect your wallet", "Connect", "Sgin In", "Wallet"]
    let found_button = false
    for (const wallet_button_string of wallet_buttons) {
      if(found_button) break;
      try {
      const wallet_button = await page.waitForXPath(`//*[text()="${wallet_button_string}"]`);
      await page.evaluate($submit => $submit.click(), wallet_button);
      found_button = true
      } catch {
        logger.debug('try next wallet button')
      }
    }


    

    const mm_button = await page.waitForXPath('//*[text()="MetaMask"]')
    let newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
    await page.evaluate($submit => $submit.click(), mm_button);



    //await waitForNavigation(page)
    logger.debug(`nr of pages: ${pages.length}`)
    logger.debug(`html page 0: ${await (pages[pages.length -2]).content()}`)
    logger.debug(`html page 1: ${await (pages[pages.length -1]).content()}`)

   /* const wallet_button = await page.waitForXPath('//*[@id="root"]/div/div[4]/header/div/button/span');
    await page.evaluate($submit => $submit.click(), wallet_button);
    const mm_button = await page.waitForXPath('/html/body/aside/section/ul/li[1]/button/span')
    await page.evaluate($submit => $submit.click(), mm_button);
    */
    //const html = await page.content()
    //logger.debug(`html: ${html}`)
   // await page.waitForNavigation();

    const pages1 = await browser.pages()
    logger.debug(`nr of pages:: ${pages1.length}`)
    //logger.debug(`html page 2: ${await (pages1[pages1.length -1]).content()}`)


   // const newPageResult = timeoutPromise(newPagePromise, 10000);
    let popup = await newPagePromise;

    //await mm_login.bringToFront();

   
    //connect
    const next_button = await popup.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/div[2]/button[2]');
    await popup.evaluate($submit => $submit.click(), next_button);
    const continue_button = await popup.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[2]/div[2]/div[2]/footer/button[2]');
    await popup.evaluate($submit => $submit.click(), continue_button);
    
    const waitTimeMs = args.secs * 1500
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
          `${JSON.stringify(loginRegisterLinkAttrs)} ErrorMsg: ${pageUtils.removeNewLineChar(error.message)}`);
      return false;
  }
  return true;
}

module.exports = {
  crawl
}


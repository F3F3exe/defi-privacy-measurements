const { createTimer } = require('./timer');
const braveLoggerLib = require('./logging.js')
const bravePuppeteerLib = require('./puppeteer.js')
const fs = require('fs');

let wallet = "";
let mm = "";
const waitForNavigation = async (page, maxWaitTimeInMillisecs) => {
    const POST_CLICK_LOAD_TIMEOUT = 2000;
    //let maxWaitTimeInMillisecs =  8000;
  
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
  
  const timeoutPromise = async (promise, ms) => {
    let timeout = new Promise(function(resolve, reject) {
        setTimeout(resolve, ms, 1);
    });
    let result = Promise.race([promise, timeout]).then(function(value) {
        return value;
    });
    return result;
  }

async function importWallet(mm_login) { 
    const get_started_button = await mm_login.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div/div/button');
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

 } 


 async function check_for_instant_popup(page,logger ,browser) {
    logger.debug(`nr of pages:: ${(await browser.pages()).length}`)
    let pages_instant_popup = await browser.pages();
    if (pages_instant_popup.length == 4){
      await (pages_instant_popup[3]).bringToFront();
      let page = pages_instant_popup[3];
      logger.debug(`found popup`);
      const next_button = await page.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/div[2]/button[2]');
      await page.evaluate($submit => $submit.click(), next_button);
      const continue_button = await page.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[2]/div[2]/div[2]/footer/button[2]');
      let newPagePromise1 = new Promise(x => browser.once('targetcreated', target => x(target.page())));
      await page.evaluate($submit => $submit.click(), continue_button);

      try {
        const newPageResult1 = timeoutPromise(newPagePromise1, 1000);
        let popup1 = await newPageResult1;
        const sign_button = await popup1.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/button[2]');
        await popup1.evaluate($submit => $submit.click(), sign_button);
      } catch (error) {
        logger.debug('no signature needed');
      }
 }
}


 async function connectWallet(page, logger, browser){
    let url = page.url();
    await waitForNavigation(page, 8000);
    let pages_instant_popup = await browser.pages();
    if (pages_instant_popup.length == 4){
    await check_for_instant_popup(page, logger, browser);
    let content = url + ': ' + wallet + ', ' + mm + '\n'
    fs.appendFile('/home/fefe/new/defi-privacy-measurements/connect_logs_whats_in_your_wallet.txt', content, err => {
      if (err) {
        console.log('no login found');
      }
    });
    } else {
    let newPagePromise = null
    let wallet_buttons = [ "Connect Wallet", "Connect wallet", "connect wallet", "Connect to a wallet",  "Connect to wallet", "Connect your wallet", "Connect Wallet", "Sign In", "Connect wallet", "Connect", "CONNECT WALLET", "CONNECT", "SIGN IN", "WALLET", "SIGN", "sign", "SIGNIN", "Sign Up", "Connect Your Wallet", "Wallet", "Connect", "Connect a Wallet", "Connect a wallet", "Sign in", "sign in", "connect"]
    let found_wallet_button = false
    for (const wallet_button_string of wallet_buttons) {
      if(found_wallet_button) break;
      try {

      const wallet_button = await page.waitForXPath(`//*[normalize-space(text())="${wallet_button_string}"]`, {timeout: 200});
     
      //const wallet_button = await page.waitForXPath(`//*[normalize-space(text())=${wallet_button_string}]`, {timeout: 200});

      //let dummy_page = await browser.newPage();
      newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
     //logger.debug(`nr of pages:: ${(await browser.pages()).length}`)

     await page.evaluate($submit => $submit.click(), wallet_button);

      found_wallet_button = true
      
      logger.debug(`found wallet button: ${wallet_button_string}`);
      wallet = wallet_button_string;
      } catch {
        logger.debug('try next wallet button')
      }
    }
    
    try {
      let mm_button_check = null;
      mm_button_check = await page.waitForXPath(`//*[contains(text(), "metamask")]`, {timeout: 200});
      await page.evaluate($submit => $submit.click(), mm_button_check);

    } catch {
      try {
        const wallet_button = await page.waitForXPath(`//button[contains(text(),"Connect")]`, {timeout: 200});
        await page.evaluate($submit => $submit.click(), wallet_button);
      } catch (error) {
         logger.debug('blaa');
      }
    }


    const newPageResult1 = timeoutPromise(newPagePromise, 1000);
    let popup1 = await newPageResult1;

    logger.debug(`popup1: ${popup1}`);

    let mm_buttons = ["metamask", "MetaMask", "Metamask",  "Connect MetaMask", "Connect Metamask", "Connect Metamask", "Continue", "Connect to MetaMask", "browser wallet", "Browser Wallet", "Browser wallet", "Metamask & Web3", "Metamask\n& Web3"];

   // const mm_button = await page.waitForXPath('//*[text()="MetaMask"]')
    //let newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
   // await page.evaluate($submit => $submit.click(), mm_button);
    logger.debug(`pages: ${(await browser.pages()).length}`)
    try {
      const click_agree_button = await page.waitForXPath('//input[@type="checkbox"]', {timeout: 200});
      await page.evaluate($submit => $submit.click(), click_agree_button);
      //await page.$eval(`input[type="checkbox"]`, check => check.checked = true);
      console.log('clicked checkbox')
      //await page.evaluate($submit => $submit.click(), cb_button);
    } catch (error) {
      console.log('no checkbox found');
    }
    try {
      const wallet_button = await page.waitForXPath(`//*[contains(text(),"Ethereum")]`, {timeout: 200});
      await page.evaluate($submit => $submit.click(), wallet_button);
      const continue_button = await page.waitForXPath(`//*[contains(text(),"start")]`, {timeout: 200});
      await page.evaluate($submit => $submit.click(), continue_button);
    } catch {
      logger.debug('already on ethereum network');
    }
    console.log('find mm button now');
    let found_mm_button = false;
    for (const mm_button_string of mm_buttons) {
      if(found_mm_button) break;
      try {
        //let dummy_page = await browser.newPage();
        //await page.bringToFront();
        const mm_button = await page.waitForXPath(`//*[normalize-space(text())="${mm_button_string}"]`, {timeout: 200});
        newPagePromise = new Promise(x => browser.once('targetcreated', target => x(target.page())));
        await page.evaluate($submit => $submit.click(), mm_button);
        found_mm_button = true;
        mm = mm_button_string;
        logger.debug(`found mm button: ${mm_button_string}`);
      } catch {
        logger.debug('try next metamask button');
      }
    }
    
   /* try {
      const mm_button =  await page.waitForXPath(`//*[@id="app"]/div/div[1]/div[1]/div[2]/div[1]/div/div[2]/div/div/div[3]/div/div[3]/div[2]/div[1]/i`);
      const rect = await page.evaluate(el => {
          const {x,y} = el.getBoundingClientRect();
          return {x,y};

      }, mm_button);
      logger.debug(`x: ${rect.x}, y: ${rect.y}`);
    } catch {
      logger.debug('bla');
    }*/

    
    // /html/body/onboard-v2//section/div/div/div/div/div/div/div/div[2]/div[2]/div/div/button[1]/span
    // section > div > div > div > div > div > div > div > div.scroll-container.svelte-ro440k > div.svelte-ro440k > div > div > button:nth-child(6) > span
    // name svelte-1hnpcft
    //section > div > div > div > div > div > div > div > div.scroll-container.svelte-1n0mo1q > div.svelte-1n0mo1q > div > div > button:nth-child(1) > span
   
    if (mm == ""){
    try {
      await page.mouse.click(600, 300);
      
    } catch {
      logger.debug('next coordinate click ')
    }
    }
    //await waitForNavigation(page)
    //logger.debug(`nr of pages: ${pages.length}`)
    //logger.debug(`html page 0: ${await (pages[pages.length -2]).content()}`)
    //logger.debug(`html page 1: ${await (pages[pages.length -1]).content()}`)

   /* const wallet_button = await page.waitForXPath('//*[@id="root"]/div/div[4]/header/div/button/span');
    await page.evaluate($submit => $submit.click(), wallet_button);
    const mm_button = await page.waitForXPath('/html/body/aside/section/ul/li[1]/button/span')
    await page.evaluate($submit => $submit.click(), mm_button);
    */
    //const html = await page.content()
    //logger.debug(`html: ${html}`)
    await waitForNavigation(page,2000);

    const pages1 = await browser.pages()
    logger.debug(`nr of pages:: ${pages1.length}`)
    //logger.debug(`html page 2: ${await (pages1[pages1.length -1]).content()}`)


    const newPageResult = timeoutPromise(newPagePromise, 1000);
    let popup = await newPageResult;

    //await mm_login.bringToFront();
    logger.debug(`popup:: ${popup}`)
    let newPagePromise1 = null;
    //connect
    if(pages1.length == 4){
      popup = pages1[pages1.length - 1]
    }
    const next_button = await popup.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/div[2]/button[2]');
    await popup.evaluate($submit => $submit.click(), next_button);
    const continue_button = await popup.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[2]/div[2]/div[2]/footer/button[2]');
    newPagePromise1 = new Promise(x => browser.once('targetcreated', target => x(target.page())));
    await popup.evaluate($submit => $submit.click(), continue_button);

    try {
      const newPageResult1 = timeoutPromise(newPagePromise1, 1000);
      let popup1 = await newPageResult1;
      const sign_button = await popup1.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/button[2]');
      await popup1.evaluate($submit => $submit.click(), sign_button);
    } catch (error) {
      logger.debug('no signature needed');
    }


    let content = url + ': ' + wallet + ', ' + mm + '\n'
    fs.appendFile('/home/fefe/new/defi-privacy-measurements/connect_logs_whats_in_your_wallet.txt', content, err => {
      if (err) {
        console.log('no login found');
      }
    });
    }
 }

 async function connectMetamask(){

 }


module.exports = {
    importWallet, 
    connectWallet, 
    connectMetamask
};



 //page.setViewport(DEFAULT_VIEWPORT)
    //await (pages[pages.length - 2]).bringToFront();
    /*await waitForNavigation(page)
    logger.debug(`nr of pages:: ${(await browser.pages()).length}`)
    let pages_instant_popup = await browser.pages();
    if (pages_instant_popup.length == 5){
      await (pages_instant_popup[4]).bringToFront();
      let page = pages_instant_popup[4];
      logger.debug(`found popup`);
      const next_button = await page.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/div[2]/button[2]');
      await page.evaluate($submit => $submit.click(), next_button);
      const continue_button = await page.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[2]/div[2]/div[2]/footer/button[2]');
      let newPagePromise1 = new Promise(x => browser.once('targetcreated', target => x(target.page())));
      await page.evaluate($submit => $submit.click(), continue_button);

      try {
        const newPageResult1 = timeoutPromise(newPagePromise1, 1000);
        let popup1 = await newPageResult1;
        const sign_button = await popup1.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/button[2]');
        await popup1.evaluate($submit => $submit.click(), sign_button);
      } catch (error) {
        logger.debug('no signature needed');
      }
    } else {*/
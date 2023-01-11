const { createTimer } = require('./timer');
const braveLoggerLib = require('./logging.js')
const bravePuppeteerLib = require('./puppeteer.js')
const fs = require('fs');
const { resolve } = require('path');


let wallet = "";
let mm = "";
const waitForNavigation = async (page, maxWaitTimeInMillisecs) => {
    const POST_CLICK_LOAD_TIMEOUT = 500;
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


 async function launchApp(page, logger, browser){
    await waitForNavigation(page, 4000);
    
    let poss_launch_buttons = [];
    let launch_strings = ["Launch App", "Play", "Touch", "Start"];

    let html = await page.content();
    for (const x of launch_strings){
      if(html.includes(x)){
        poss_launch_buttons.push(x);

      }
    }
    let url = "";
    console.log(`poss launch buttons: ${poss_launch_buttons}`);

    for (const wallet_button_string of poss_launch_buttons) {
      try {
        let mm_button = await page.$x(`//*[contains(text(), ${wallet_button_string})]`);     
        await mm_button[0].click();
      
      console.log(`clicked wallet button: ${wallet_button_string}`);
      await waitForNavigation(page, 1000);
        url = await page.url();
        console.log(`clicked wallet url: ${url}`);
      } catch (error) {
          logger.debug(`try next wallet button: ${error}`)
    
        }
      }
    

    //record that we were able to login
    let content = url + ': ' + '\n'
    fs.appendFile('/home/fefe/new/defi-privacy-measurements/new_urls.txt', content, err => {
      if (err) {
        console.log('no login found');
      }
    });

    return url;

 }


 async function connectWallet(page, logger, browser, args){

    await waitForNavigation(page, 4000);
    let url = page.url();

    
    let poss_wallet_buttons = []
    'Login wallet', "Sign in" , "sign in with metamask"

    let html = await page.content();
    let wallet_strings = [ "Connect Wallet", "Connect wallet", "connect wallet", "Connect to a wallet",  "Connect to wallet", "Connect your wallet", "Sign In", "Connect", "CONNECT WALLET", "CONNECT", "SIGN IN", "WALLET", "SIGN", "sign", "SIGNIN", "Sign Up", "Connect Your Wallet", "Wallet", "Connect a Wallet", "Connect a wallet", "Sign in", "sign in", "connect", "Log in via web3 wallet", "wallet", "account", "Sign Up", "sign up", "Sign", "Play"]

    //search for possible wallet buttons in the html
    for (const x of wallet_strings){
      if(html.includes(x)){
        poss_wallet_buttons.push(x);

      }
    }
    
  let connected = false;
  console.log(poss_wallet_buttons);
  //try to click one of the possible wallet buttons
    for (const wallet_button_string of poss_wallet_buttons) {
      try {
        const wallet_button = await page.waitForXPath(`//*[text()="${wallet_button_string}"]`, {timeout: 200});
        
     await page.evaluate($submit => $submit.click(), wallet_button);
      wallet = wallet_button_string;
      console.log(`clicked wallet button: ${wallet_button_string}`);
      break;
      } catch {
        try {
          //also try to click it via its coordinates
          const wallet_button = await page.waitForXPath(`//*[normalize-space(text())="${wallet_button_string}"]`, {timeout: 200});

          const rect = await page.evaluate(el => {
            const {x,y} = el.getBoundingClientRect();
            return {x,y};
    
        }, wallet_button);
        await page.mouse.click(rect.x+3, rect.y+3);
        wallet = wallet_button_string;
        break;
      } catch (error) {
          logger.debug(`try next wallet button: ${error}`)
    
        }
      }
    }
    
    
    //if no 'wallet button' was found, we try the less precise 'contains method'
    if(wallet == ""){
      for (const wallet_button_string of poss_wallet_buttons) {

      try {
        let mm_button = await page.$x(`//button[contains(text(), ${wallet_button_string})]`);     
        await mm_button[0].click();
        console.log(`wallet clicked: ${wallet_button_string}`);
        wallet = wallet_button_string;
        break;
      } catch (error) {
      }
    }
    }
    
    
    
    
    let checkbox_clicked = false;
    let d = new Date();
    let start = d.getTime();

    while(true){

      //timeout for the while loop
      let d = new Date();
      let now = d.getTime();
      if((now-start)>30000) {
    
        console.log(`diff: ${now - start}`);
         break;
        }

        //we have a metamask popup
    let pages3 = await browser.pages();
    if(pages3.length > 3){
      break;}
    

    await waitForNavigation(page,2000);
  
    
      

    let html_mm = await page.content();
    let poss_other_buttons = [];
    let poss_mm_buttons = [];

    //first we check for 'metamask connect' strings in the html
    let metamask_strings = ["MetaMask", "metamask",  "Connect Metamask","Connect MetaMask","Metamask", "Connect to MetaMask", "browser wallet", "Browser Wallet", "Browser wallet", "Metamask & Web3", "Metamask\n& Web3", "Metamask \n& Web3"];
    for (const x of metamask_strings){
      if(html_mm.includes(x)){
        logger.debug(`mm: ${x}`);
        poss_mm_buttons.push(x);

      }
      
    }

    console.log(poss_mm_buttons);
    //we also check for other strings that are related to connecting to mm in case we require some extra steps
    let other_strings = ["Connect", "Select", "Connect Wallet", "CONNECT WALLET", "Get started", "Web3" ];
    for (const x of other_strings){
      if(html_mm.includes(x)){
        poss_other_buttons.push(x);

      }
    }
    poss_other_buttons = poss_mm_buttons.concat(poss_other_buttons);
    
    console.log(poss_other_buttons);
    //we check for if we can click any of the mm strings
    for (const mm_button_string of poss_mm_buttons) {
      console.log(`it: ${mm_button_string}`);
      //first we try to find an explicit button with the mm string
      await waitForNavigation(page,400);

      try {
        const mm_button = await page.waitForXPath(`//button[(text())="${mm_button_string}"]`, {timeout: 200});
        //await page.evaluate($submit => $submit.click(), mm_button);
        const rect = await page.evaluate(el => { const {x,y} = el.getBoundingClientRect(); return {x,y}; }, mm_button);

          await page.mouse.click(rect.x+1, rect.y+1);
          //mm = mm_button_string;
        mm = mm_button_string;
      } catch (error) {
       try {
        //otherwise we try to find any other element with the mm string
        const mm_button = await page.waitForXPath(`//*[(text())="${mm_button_string}"]`, {timeout: 200});
        //await page.evaluate($submit => $submit.click(), mm_button);
        const rect = await page.evaluate(el => { const {x,y} = el.getBoundingClientRect(); return {x,y}; }, mm_button);

          await page.mouse.click(rect.x+1, rect.y+1);
          //mm = mm_button_string;
        mm = mm_button_string;
       }/* catch (error){
        
        //also try to 'force click' any element with the mm string
        try {         
          const mm_button = await page.waitForXPath(`//*[text()="${mm_button_string}"]`, {timeout: 200});
          const rect = await page.evaluate(el => { const {x,y} = el.getBoundingClientRect(); return {x,y}; }, mm_button);

          await page.mouse.click(rect.x+1, rect.y+1);
          mm = mm_button_string;
      } */ catch (error) {
          //else try the next mm string we found
          logger.debug(`try next mm button: ${error}`)
    
        
      }
    }
    }

    await waitForNavigation(page, 2000);


    //try to find a checkbox (e.g. agree to terms) 
    //we also 'force click' this checkbox and do it after first checking the mm strings 
    //since we might click some other unrelated checkbox
    //we only click this box once, otherwise we would unclick it for the loop iteration
    try {
      let new_checkbox = await page.waitForXPath('//input[@type="checkbox"]', {timeout: 500});
      if (checkbox_clicked == true) {
        const rect = await page.evaluate(el => {
          const {x,y} = el.getBoundingClientRect();
          return {x,y};     }, new_checkbox);

        await page.mouse.click(rect.x+1, rect.y+1);
      }
      if (checkbox_clicked == false) {
        
      await page.evaluate($submit => $submit.click(), new_checkbox);
      checkbox_clicked = true;
      }
      
    } catch { 
        console.log('no checkbox found');
      }

      await waitForNavigation(page, 2000);

      //same thing for the rest of the buttons
      for (const mm_button_string of poss_other_buttons) {
        console.log(`it2: ${mm_button_string}`);

        await waitForNavigation(page,200);

        try {
          const mm_button = await page.waitForXPath(`//button[normalize-space(text())="${mm_button_string}"]`, {timeout: 200});
          if(poss_mm_buttons.includes(mm_button_string)){
            const rect = await page.evaluate(el => {
              const {x,y} = el.getBoundingClientRect();
              return {x,y};     }, mm_button);
    
            await page.mouse.click(rect.x+1, rect.y+1);
          } else 
          await page.evaluate($submit => $submit.click(), mm_button);
          

          mm = mm_button_string;
        } catch (error) {
        try {
  
        const mm_button = await page.waitForXPath(`//*[normalize-space(text())="${mm_button_string}"]`, {timeout: 200});
        if(poss_mm_buttons.includes(mm_button_string)){
          const rect = await page.evaluate(el => {
            const {x,y} = el.getBoundingClientRect();
            return {x,y};     }, mm_button);
  
          await page.mouse.click(rect.x+1, rect.y+1);
        } else 
       await page.evaluate($submit => $submit.click(), mm_button);
       
       mm = mm_button_string;
        } catch (error) {
          
            logger.debug(`try next mm button: ${error}`)
      
          }
        }
      
      }  
  }

  
    
    let popup = null;
    let pages = await browser.pages();

    //semi-good workaround for the non-visible mm buttons
    if(pages.length <= 3){
      try {
        //TODO: this probably only works for my screen, need to adjust it based on screen size
        await page.mouse.click(600, 300);
        const mm_button = await page.waitForXPath(`//*[text()="${wallet}"]`, {timeout: 200});
        await page.evaluate($submit => $submit.click(), mm_button);
        await page.mouse.click(600, 300);
      } catch {
        logger.debug('failed coordinate click ');
      }
    }
    
    await waitForNavigation(page, 4000);

    pages = await browser.pages();
    if(pages.length < 4){
      let html_mm = await page.content();
      let poss_mm_buttons = [];
  
      //first we check for 'metamask connect' strings in the html
      let metamask_strings = ["MetaMask", "metamask",  "Connect Metamask","Connect MetaMask","Metamask", "Connect to MetaMask", "browser wallet", "Browser Wallet", "Browser wallet", "Metamask & Web3", "Metamask\n& Web3", "Metamask \n& Web3" ];
      for (const x of metamask_strings){
        if(html_mm.includes(x)){
          logger.debug(`mm: ${x}`);
          poss_mm_buttons.push(x);
  
        }
        
      }
      if(poss_mm_buttons == []){
      try {
        //const mm_button = await page.waitForXPath(`//*[text()="${wallet}"]`, {timeout: 200});
        //await page.evaluate($submit => $submit.click(), mm_button);
        let mm_button = await page.$x(`//button[contains(text(), ${wallet})]`);     
        await mm_button[0].click();
         /*   const rect = await page.evaluate(el => {
              const {x,y} = el.getBoundingClientRect();
              return {x,y};
      
          }, mm_button);
          await page.mouse.click(rect.x+1, rect.y+1);*/
      } catch {

      }
      }

      let found_mm_button = false
      for (const metamask_button_string of metamask_strings) {
        if(found_mm_button) break;
        try {

        const mm_button = await page.waitForXPath(`//*[normalize-space(text())="${metamask_button_string}"]`, {timeout: 200});

      
      await page.evaluate($submit => $submit.click(), mm_button);

      found_mm_button = true
        logger.debug(`found mm button: ${metamask_button_string}`);
        mm = metamask_button_string;
        } catch {
          logger.debug('try next mm button')
        }
      }
      
    }
    pages = await browser.pages();
    //most metamask popups are opened as a new page
    if(pages.length > 3){
      popup = pages[pages.length - 1];
    } else {
      //sometime a metamask popup is not visible to puppeteer as a new page and we force-open it ourselfs
        popup = await browser.newPage();
        await popup.goto('chrome-extension://ideknfmpapgmgohlgpglnlelhkfaelfg/notification.html');
        await popup.bringToFront();
        await waitForNavigation(popup, 4000);
    }
        //connect metamask
        try {
        const next_button = await popup.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/div[2]/button[2]');
        await popup.evaluate($submit => $submit.click(), next_button);
        logger.debug('clicker connect');
        const continue_button = await popup.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[2]/div[2]/div[2]/footer/button[2]');
        await popup.evaluate($submit => $submit.click(), continue_button);
        logger.debug('clicker next');
        connected = true;
        
        } catch (error) {
          logger.debug(`no metamask popup: ${error}`);
        }

    //record that we were able to login
    let content = url + ': ' + connected + '\n'
    fs.appendFile('/home/fefe/new/defi-privacy-measurements/connect_logs_whats_in_your_wallet.txt', content, err => {
      if (err) {
        console.log('no login found');
      }
    });

    await waitForNavigation(page, 4000);
    
    //sign the metamask login
    pages = await browser.pages();
        console.log(`pages for sign: ${pages.length}`);
        if(pages.length > 3){
          try {
          let popup = pages[pages.length - 1];
          const Sign_button = await popup.waitForXPath('//*[@id="app-content"]/div/div[2]/div/div[3]/button[2]');
        await popup.evaluate($submit => $submit.click(), Sign_button);
        console.log('signed');
          } catch (error) {}
        }

    }
 

 


module.exports = {
    importWallet, 
    connectWallet,
    launchApp
};

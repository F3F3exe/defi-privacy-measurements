const puppeteerExtraLib = require('puppeteer-extra')
const puppeteerExtraPluginStealthLib = require('puppeteer-extra-plugin-stealth')
const { getLogger } = require('./logging')
puppeteerExtraLib.use(puppeteerExtraPluginStealthLib())

const launch = async args => {
  const puppeteerArgs = {
    defaultViewport: null,
    args: [],
    executablePath: args.executablePath,
    headless: args.headless
  }
  puppeteerArgs.args.push(`--start-maximized`)
  puppeteerArgs.args.push(`--disable-popup-blocking`)
  puppeteerArgs.args.push(`--allow-popups-during-upload`)


  if (args.metamaskPath) {
    puppeteerArgs.args.push(`--disable-extensions-except=${args.metamaskPath}`)
    puppeteerArgs.args.push(`--load-extension=${args.metamaskPath}`)
  }

  if (args.profilePath) {
    puppeteerArgs.args.push(`--user-data-dir=${args.profilePath}`)
  }

  if (args.extraArgs) {
    puppeteerArgs.args.push(...args.extraArgs)
  }

  const browser =  await puppeteerExtraLib.launch(puppeteerArgs)

  const pages = await browser.pages()
  console.log(`NR pages: ${pages.length}`)
  console.log(`HTML: ${await (pages[pages.length -1 ]).content()}`)
  
  return browser
}

module.exports = {
  launch
}

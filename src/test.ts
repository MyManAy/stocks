import puppeteer, { ElementHandle, type Browser } from "puppeteer";
import existingJSON from "./data.json" assert { type: "json" };
import * as fs from "fs";

const chicago_datetime_str = new Date().toLocaleString("en-US", {
  timeZone: "America/Chicago",
});
const today = new Date(chicago_datetime_str);
const day = today.getDay();
const SATURDAY = 6;
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const daysToAdd = day === SATURDAY ? 2 : 1;
const startDate = new Date(today.getTime() + MS_IN_DAY * daysToAdd);

type StockData = {
  growthPercentage: string;
  ticker: string;
  revenue: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fetchData = async (url: string, browser: Browser) => {
  const page = await browser.newPage();
  await page.goto(url);
  try {
    const button = await page.waitForXPath(
      "//*[@id='cookieConsent']/div/div[3]/button",
      { timeout: 500 }
    );
    await (button as any).click();
  } catch {}
  await page.waitForSelector(".grwthno");

  const data = await page.evaluate(async () => {
    const tailwindalizer = (tailwindClassName: string) =>
      tailwindClassName
        .split(" ")
        .map((item) => "." + item)
        .join("");
    const growthPercentages = Array.from(
      document.querySelectorAll(".grwthno")
    ).map((item) => item.innerHTML);

    const tickers = Array.from(
      document.querySelectorAll(tailwindalizer("col-12 text-center mcalticker"))
    ).map((item) => item.innerHTML);

    const revenues = Array.from(
      document.querySelectorAll(tailwindalizer("row calrows epsdateconfirmed"))
    ).map(
      (item) =>
        Array.from(
          item.querySelectorAll(tailwindalizer("row d-flex d-xl-none"))
        )[1]
          .querySelectorAll(tailwindalizer("col-5 text-center"))[0]
          .querySelector(".col-5").innerHTML
    );

    const stockDatas: StockData[] = growthPercentages.map((item, index) => ({
      growthPercentage: item,
      ticker: tickers[index],
      revenue: revenues[index],
    }));
    return stockDatas;
  });
  console.log(data);
  return data;
};

const runWeek = async () => {
  const market = {
    open: [] as StockData[],
    close: [] as StockData[],
  };
  const result = {
    monday: { ...market },
    tuesday: { ...market },
    wednesday: { ...market },
    thursday: { ...market },
    friday: { ...market },
  };

  // to make dictionary where number is indexed to day of the week from today to friday
  const weekday = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  let mapping = {};
  let incrementingDay = startDate;
  let index = 0;
  const getWeekdayNumber = () => incrementingDay.getDay() - 1;
  while (getWeekdayNumber() < 5) {
    mapping[index] = weekday[getWeekdayNumber()];
    const newTime = MS_IN_DAY + incrementingDay.getTime();
    incrementingDay = new Date(newTime);
    index++;
  }

  const browser: Browser = await puppeteer.launch({ headless: false });
  for (let i = 0; i < 3; i++) {
    const date = new Date(startDate.getTime() + MS_IN_DAY * i);
    const [year, month, day] = [
      date.getFullYear(),
      (date.getMonth() + 1).toString().padStart(2, "0"),
      date.getDate().toString().padStart(2, "0"),
    ];
    const MARKET_OPEN = 1;
    const MARKET_CLOSE = 3;
    const base_url = `https://www.earningswhispers.com/calendar/${year}${month}${day}`;
    result[mapping[i]].open = await fetchData(
      `${base_url}/${MARKET_OPEN}`,
      browser
    );
    result[mapping[i]].close = await fetchData(
      `${base_url}/${MARKET_CLOSE}`,
      browser
    );
  }
  browser.close();
  return result;
};

const result = await runWeek();

let overBillions = JSON.parse(JSON.stringify(result));
for (const week in result) {
  const whereBillion = (item: StockData) =>
    (item.revenue?.length > 7 || item.revenue?.includes("B")) ?? false;
  const { open, close } = result[week];
  overBillions[week].open = open.filter(whereBillion);
  overBillions[week].close = close.filter(whereBillion);
}

const email = "mkravikumar@gmail.com";
const password = "Aug$su21st";

const loginUrl = "https://stockunlock.com/login";

const browser: Browser = await puppeteer.launch();

const login = await browser.newPage();
await login.goto(loginUrl);
const emailForm = await login.waitForXPath("//*[@id='email']");
const passwordForm = await login.waitForXPath("//*[@id='current-password']");
const loginButton = await login.waitForXPath(
  "//*[@id='root']/div/div[2]/div/div/div/div/form/div/button[2]"
);
await emailForm.type(email);
await passwordForm.type(password);
await (loginButton as ElementHandle<Element>).click();
await login.waitForNavigation();

const target = await browser.newPage();
const insightFromStock = async (ticker: string) => {
  const targetUrl = `https://stockunlock.com/stockDetails/${ticker.toUpperCase()}/general`;
  await target.goto(targetUrl);
  try {
    await target.waitForXPath(
      "//*[@id='root']/div[2]/main/div[1]/div/div[1]/div/div[2]/a/div/h5/span",
      { timeout: 15000 }
    );
    await sleep(3000);

    const insight = await target.evaluate(() => {
      const tailwindalizer = (tailwindClassName: string) =>
        tailwindClassName
          .split(" ")
          .map((item) => "." + item)
          .join("");
      const insightScore = document
        .querySelector(
          tailwindalizer("MuiTypography-root MuiTypography-h5 css-1p1poko")
        )
        .querySelector("span")?.textContent;
      const smth = Array.from(
        document.querySelectorAll(
          tailwindalizer(
            "MuiListItem-root MuiListItem-gutters MuiListItem-padding css-x60xby"
          )
        )
      );
      const marketCap = smth[0].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      const industry = smth[2].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-pd0kzo")
      )?.textContent;
      const EPSTTM = smth[4].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      const PETTM = smth[6].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      const forwardPE = smth[7].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      const divYield = smth[8].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      return {
        insightScore,
        marketCap,
        industry,
        EPSTTM,
        PETTM,
        forwardPE,
        divYield,
      };
    });
    return insight;
  } catch {
    const insight = await target.evaluate(() => {
      const tailwindalizer = (tailwindClassName: string) =>
        tailwindClassName
          .split(" ")
          .map((item) => "." + item)
          .join("");
      const smth = Array.from(
        document.querySelectorAll(
          tailwindalizer(
            "MuiListItem-root MuiListItem-gutters MuiListItem-padding css-x60xby"
          )
        )
      );
      const marketCap = smth[0].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      const industry = smth[2].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-pd0kzo")
      )?.textContent;
      const EPSTTM = smth[4].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      const PETTM = smth[6].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      const forwardPE = smth[7].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      const divYield = smth[8].querySelector(
        tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3")
      )?.textContent;
      return {
        insightScore: "not found",
        marketCap,
        industry,
        EPSTTM,
        PETTM,
        forwardPE,
        divYield,
      };
    });
    return insight;
  }
};

let final = JSON.parse(JSON.stringify(overBillions));

const addStockToJSON = async (stock: any) => {
  const insight = await insightFromStock(stock.ticker);
  stock = Object.assign(stock, insight);
  console.log(stock);
  const json = JSON.stringify(final);
  fs.writeFileSync(`src/data.json`, json, "utf8");
};

const checkIfInsighted = (stockToSearch: any) => {
  for (const week in existingJSON) {
    const { open, close } = existingJSON[week];
    for (const stock of open) {
      if (
        stock.ticker === stockToSearch.ticker &&
        (stock.insightScore ?? false)
      )
        return true;
      else return false;
    }
    for (const stock of close) {
      if (
        stock.ticker === stockToSearch.ticker &&
        (stock.insightScore ?? false)
      )
        return true;
      else return false;
    }
  }
  return false;
};

for (const week in final) {
  const { open, close } = final[week];
  for (let stock of open) {
    // if (!checkIfInsighted(stock)) await addStockToJSON(stock);
    await addStockToJSON(stock);
  }
  for (let stock of close) {
    // if (!checkIfInsighted(stock)) await addStockToJSON(stock);
    await addStockToJSON(stock);
  }
}
await browser.close();

import puppeteer from "puppeteer";
import existingJSON from "./data.json" assert { type: "json" };
import "dotenv/config";
const chicago_datetime_str = new Date().toLocaleString("en-US", {
    timeZone: "America/Chicago",
});
const today = new Date(chicago_datetime_str);
const day = today.getDay();
const SATURDAY = 6;
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const daysToAdd = day === SATURDAY ? 2 : 1;
const startDate = new Date(today.getTime() + MS_IN_DAY * daysToAdd);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fetchData = async (url, browser) => {
    const page = await browser.newPage();
    await page.goto(url);
    try {
        const button = await page.waitForXPath("//*[@id='cookieConsent']/div/div[3]/button", { timeout: 500 });
        await button.click();
    }
    catch (_a) { }
    await page.waitForSelector(".grwthno");
    const data = await page.evaluate(async () => {
        const tailwindalizer = (tailwindClassName) => tailwindClassName
            .split(" ")
            .map((item) => "." + item)
            .join("");
        const growthPercentages = Array.from(document.querySelectorAll(".grwthno")).map((item) => item.innerHTML);
        const tickers = Array.from(document.querySelectorAll(tailwindalizer("col-12 text-center mcalticker"))).map((item) => item.innerHTML);
        const revenues = Array.from(document.querySelectorAll(tailwindalizer("row calrows epsdateconfirmed"))).map((item) => Array.from(item.querySelectorAll(tailwindalizer("row d-flex d-xl-none")))[1]
            .querySelectorAll(tailwindalizer("col-5 text-center"))[0]
            .querySelector(".col-5").innerHTML);
        const stockDatas = growthPercentages.map((item, index) => ({
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
        open: [],
        close: [],
    };
    const result = {
        monday: Object.assign({}, market),
        tuesday: Object.assign({}, market),
        wednesday: Object.assign({}, market),
        thursday: Object.assign({}, market),
        friday: Object.assign({}, market),
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
    const browser = await puppeteer.launch({ headless: false });
    for (let i = 0; i < Object.keys(mapping).length; i++) {
        const date = new Date(startDate.getTime() + MS_IN_DAY * i);
        const [year, month, day] = [
            date.getFullYear(),
            (date.getMonth() + 1).toString().padStart(2, "0"),
            date.getDate().toString().padStart(2, "0"),
        ];
        const MARKET_OPEN = 1;
        const MARKET_CLOSE = 3;
        const base_url = `https://www.earningswhispers.com/calendar/${year}${month}${day}`;
        result[mapping[i]].open = await fetchData(`${base_url}/${MARKET_OPEN}`, browser);
        result[mapping[i]].close = await fetchData(`${base_url}/${MARKET_CLOSE}`, browser);
    }
    browser.close();
    return result;
};
const result = await runWeek();
let overBillions = JSON.parse(JSON.stringify(result));
for (const week in result) {
    const whereBillion = (item) => { var _a, _b, _c; return (_c = (((_a = item.revenue) === null || _a === void 0 ? void 0 : _a.length) > 7 || ((_b = item.revenue) === null || _b === void 0 ? void 0 : _b.includes("B")))) !== null && _c !== void 0 ? _c : false; };
    const { open, close } = result[week];
    overBillions[week].open = open.filter(whereBillion);
    overBillions[week].close = close.filter(whereBillion);
}
const loginUrl = "https://stockunlock.com/login";
const browser = await puppeteer.launch();
const login = await browser.newPage();
await login.goto(loginUrl);
const emailForm = await login.waitForXPath("//*[@id='email']");
const passwordForm = await login.waitForXPath("//*[@id='current-password']");
const loginButton = await login.waitForXPath("//*[@id='root']/div/div[2]/div/div/div/div/form/div/button[2]");
await emailForm.type(process.env.STOCK_UNLOCK_EMAIL);
await passwordForm.type(process.env.STOCK_UNLOCK_PASSWORD);
await loginButton.click();
await login.waitForNavigation();
const target = await browser.newPage();
const insightFromStock = async (ticker) => {
    const targetUrl = `https://stockunlock.com/stockDetails/${ticker.toUpperCase()}/general`;
    await target.goto(targetUrl);
    try {
        await target.waitForXPath("//*[@id='root']/div[2]/main/div[1]/div/div[1]/div/div[2]/a/div/h5/span", { timeout: 15000 });
        await sleep(3000);
        const insight = await target.evaluate(() => {
            var _a, _b, _c, _d, _e, _f, _g;
            const tailwindalizer = (tailwindClassName) => tailwindClassName
                .split(" ")
                .map((item) => "." + item)
                .join("");
            const insightScore = (_a = document
                .querySelector(tailwindalizer("MuiTypography-root MuiTypography-h5 css-1p1poko"))
                .querySelector("span")) === null || _a === void 0 ? void 0 : _a.textContent;
            const smth = Array.from(document.querySelectorAll(tailwindalizer("MuiListItem-root MuiListItem-gutters MuiListItem-padding css-x60xby")));
            const marketCap = (_b = smth[0].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _b === void 0 ? void 0 : _b.textContent;
            const industry = (_c = smth[2].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-pd0kzo"))) === null || _c === void 0 ? void 0 : _c.textContent;
            const EPSTTM = (_d = smth[4].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _d === void 0 ? void 0 : _d.textContent;
            const PETTM = (_e = smth[6].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _e === void 0 ? void 0 : _e.textContent;
            const forwardPE = (_f = smth[7].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _f === void 0 ? void 0 : _f.textContent;
            const divYield = (_g = smth[8].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _g === void 0 ? void 0 : _g.textContent;
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
    }
    catch (_a) {
        const insight = await target.evaluate(() => {
            var _a, _b, _c, _d, _e, _f;
            const tailwindalizer = (tailwindClassName) => tailwindClassName
                .split(" ")
                .map((item) => "." + item)
                .join("");
            const smth = Array.from(document.querySelectorAll(tailwindalizer("MuiListItem-root MuiListItem-gutters MuiListItem-padding css-x60xby")));
            const marketCap = (_a = smth[0].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _a === void 0 ? void 0 : _a.textContent;
            const industry = (_b = smth[2].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-pd0kzo"))) === null || _b === void 0 ? void 0 : _b.textContent;
            const EPSTTM = (_c = smth[4].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _c === void 0 ? void 0 : _c.textContent;
            const PETTM = (_d = smth[6].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _d === void 0 ? void 0 : _d.textContent;
            const forwardPE = (_e = smth[7].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _e === void 0 ? void 0 : _e.textContent;
            const divYield = (_f = smth[8].querySelector(tailwindalizer("MuiTypography-root MuiTypography-body1 css-1ls98f3"))) === null || _f === void 0 ? void 0 : _f.textContent;
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
const addStockToJSON = async (stock) => {
    const insight = await insightFromStock(stock.ticker);
    stock = Object.assign(stock, insight);
    console.log(stock);
    const json = JSON.stringify(final);
    // fs.writeFileSync(`src/data.json`, json, "utf8");
};
const checkIfInsighted = (stockToSearch) => {
    var _a, _b;
    for (const week in existingJSON) {
        const { open, close } = existingJSON[week];
        for (const stock of open) {
            if (stock.ticker === stockToSearch.ticker &&
                ((_a = stock.insightScore) !== null && _a !== void 0 ? _a : false))
                return true;
            else
                return false;
        }
        for (const stock of close) {
            if (stock.ticker === stockToSearch.ticker &&
                ((_b = stock.insightScore) !== null && _b !== void 0 ? _b : false))
                return true;
            else
                return false;
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

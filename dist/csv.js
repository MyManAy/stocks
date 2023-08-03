import existingJSON from "./data.json" assert { type: "json" };
import * as fs from "fs";
const csvmaker = function (data) {
    // Empty array for storing the values
    let csvRows = [];
    // Headers is basically a keys of an
    // object which is id, name, and
    // profession
    const headers = [
        "day",
        "time",
        "growthPercentage",
        "ticker",
        "revenue",
        "insightScore",
        "marketCap",
        "industry",
        "EPSTTM",
        "PETTM",
        "forwardPE",
        "divYield",
    ];
    // As for making csv format, headers
    // must be separated by comma and
    // pushing it into array
    csvRows.push(headers.join(","));
    // Pushing Object values into array
    // with comma separation
    for (const stock of data) {
        const values = Object.values(stock).join(",");
        csvRows.push(values);
    }
    return csvRows;
};
let data = [];
const billionRegex = /^\$((?:\d|\.)+)B/;
const trillionRegex = /^\$((?:\d|\.)+)T/;
const billionToMillion = (string) => {
    var _a, _b;
    const billions = (_a = string.match(billionRegex)) === null || _a === void 0 ? void 0 : _a[1];
    const trillions = (_b = string.match(trillionRegex)) === null || _b === void 0 ? void 0 : _b[1];
    if (billions)
        return `$${Number(billions) * 1000}M`;
    if (trillions)
        return `$${Number(trillions) * 1000 * 1000}M`;
    return string;
};
const csvReadableMoney = (string) => {
    const millions = billionToMillion(string);
    const justNumber = millions.replace("$", "").replace("M", "");
    const rounded = Math.round(Number(justNumber));
    const commaizedNumber = Number(rounded).toLocaleString("en-US");
    return commaizedNumber === "NaN" ? string : `\"${commaizedNumber}\"`;
};
for (const day in existingJSON) {
    for (const stock of existingJSON[day].open) {
        stock.marketCap = csvReadableMoney(stock.marketCap);
        stock.revenue = csvReadableMoney(stock.revenue);
        data.push(Object.assign({ day, time: "open" }, stock));
    }
    for (const stock of existingJSON[day].close) {
        stock.marketCap = csvReadableMoney(stock.marketCap);
        stock.revenue = csvReadableMoney(stock.revenue);
        data.push(Object.assign({ day, time: "close" }, stock));
    }
}
const csv = csvmaker(data);
const stringified = csv.join("\n");
fs.writeFileSync(`src/data.csv`, stringified, "utf8");
// IF YOU GET AN ERROR LIKE:
// Error: EBUSY: resource busy or locked, open 'src/data.csv'
// CLOSE EXCEL TAB WITH THE DATA.CSV FILE AND TRY AGAIN
